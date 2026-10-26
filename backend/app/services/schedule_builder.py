"""
Schedule Builder component for time-aware route assignment and pacing.
Assigns arrival, start, end, and departure times, inserts meal/rest breaks,
and generates feasibility warnings for unrealistic constraints.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from app.schemas.route import (
    RouteStopInput,
    ScheduledStop,
    RouteScheduleResponse,
    RouteLeg,
)
from app.services.route_optimizer import RouteOptimizer

class ScheduleBuilder:
    """
    Constructs chronologically sound daily schedules with breaks and pacing rules.
    """

    PACE_SETTINGS = {
        "relaxed": {
            "max_stops_per_day": 3,
            "lunch_duration_mins": 90,
            "transit_buffer_extra_mins": 10,
            "min_rest_break_mins": 30,
        },
        "moderate": {
            "max_stops_per_day": 5,
            "lunch_duration_mins": 60,
            "transit_buffer_extra_mins": 5,
            "min_rest_break_mins": 15,
        },
        "fast": {
            "max_stops_per_day": 7,
            "lunch_duration_mins": 45,
            "transit_buffer_extra_mins": 0,
            "min_rest_break_mins": 0,
        }
    }

    @classmethod
    def build_schedule(
        cls,
        stops: List[RouteStopInput],
        legs: List[RouteLeg],
        travel_pace: str = "moderate",
        day_start_time: str = "09:00",
        day_end_time: str = "21:00",
        date_str: Optional[str] = None,
        trip_id: Optional[str] = None,
        day_number: int = 1
    ) -> RouteScheduleResponse:
        """
        Assigns chronological timings, slots, lunch breaks, and checks for constraints.
        """
        pace_cfg = cls.PACE_SETTINGS.get(travel_pace.lower(), cls.PACE_SETTINGS["moderate"])
        warnings: List[str] = []

        if not stops:
            return RouteScheduleResponse(
                trip_id=trip_id,
                day_number=day_number,
                date=date_str,
                stops=[],
                warnings=["No stops provided."]
            )

        # Check if stops exceed recommended pace
        if len(stops) > pace_cfg["max_stops_per_day"]:
            warnings.append(
                f"Schedule contains {len(stops)} stops, which exceeds recommended pace for '{travel_pace}' "
                f"(max {pace_cfg['max_stops_per_day']} stops). Consider spreading activities across more days."
            )

        current_time_dt = cls._parse_time(day_start_time)
        day_end_dt = cls._parse_time(day_end_time)

        scheduled_stops: List[ScheduledStop] = []
        breaks: List[Dict[str, Any]] = []

        total_distance = 0.0
        total_transit = 0
        total_visit = 0
        lunch_inserted = False

        leg_map = {leg.to_stop_id: leg for leg in legs}

        for idx, stop in enumerate(stops, start=1):
            # Calculate transit from previous stop
            dist_from_prev = 0.0
            transit_from_prev = 0
            if idx > 1:
                leg = leg_map.get(stop.id)
                if leg:
                    dist_from_prev = leg.distance_km
                    transit_from_prev = leg.transit_minutes + pace_cfg["transit_buffer_extra_mins"]
                else:
                    dist_from_prev = 0.0
                    transit_from_prev = 15

            total_distance += dist_from_prev
            total_transit += transit_from_prev

            # Arrival time
            arrival_dt = current_time_dt + timedelta(minutes=transit_from_prev)

            # Check if lunch break should be inserted before this activity
            if not lunch_inserted and arrival_dt >= cls._parse_time("12:15") and arrival_dt <= cls._parse_time("14:30"):
                lunch_start = arrival_dt.strftime("%H:%M")
                lunch_dur = pace_cfg["lunch_duration_mins"]
                arrival_dt = arrival_dt + timedelta(minutes=lunch_dur)
                lunch_end = arrival_dt.strftime("%H:%M")
                lunch_inserted = True
                breaks.append({
                    "name": "Midday Culinary & Rest Break",
                    "start_time": lunch_start,
                    "end_time": lunch_end,
                    "duration_minutes": lunch_dur,
                    "type": "meal"
                })

            # Check time window constraints
            start_dt = arrival_dt
            if stop.time_window_start:
                tw_start = cls._parse_time(stop.time_window_start)
                if start_dt < tw_start:
                    # Arrived early, wait for window to open
                    start_dt = tw_start

            if stop.time_window_end:
                tw_end = cls._parse_time(stop.time_window_end)
                if start_dt > tw_end:
                    warnings.append(
                        f"Stop '{stop.name}' planned start ({start_dt.strftime('%H:%M')}) is after its "
                        f"preferred window end ({stop.time_window_end})."
                    )

            # Check verified opening/closing hours
            if stop.opening_time:
                op_dt = cls._parse_time(stop.opening_time)
                if start_dt < op_dt:
                    start_dt = op_dt
            if stop.closing_time:
                cl_dt = cls._parse_time(stop.closing_time)
                if start_dt > cl_dt:
                    warnings.append(
                        f"Stop '{stop.name}' arrives after venue closing time ({stop.closing_time})."
                    )

            # Activity duration and completion
            duration = stop.duration_minutes
            total_visit += duration
            end_dt = start_dt + timedelta(minutes=duration)
            departure_dt = end_dt

            # Check if exceeds day end time
            if end_dt > day_end_dt:
                warnings.append(
                    f"Stop '{stop.name}' ends at {end_dt.strftime('%H:%M')}, which exceeds the planned day end time ({day_end_time})."
                )

            # Determine time slot
            time_slot = cls._classify_time_slot(start_dt)

            scheduled_stops.append(ScheduledStop(
                id=stop.id,
                name=stop.name,
                category=stop.category,
                latitude=stop.latitude,
                longitude=stop.longitude,
                sequence_order=idx,
                arrival_time=arrival_dt.strftime("%H:%M"),
                start_time=start_dt.strftime("%H:%M"),
                end_time=end_dt.strftime("%H:%M"),
                departure_time=departure_dt.strftime("%H:%M"),
                duration_minutes=duration,
                transit_from_previous_minutes=transit_from_prev,
                distance_from_previous_km=dist_from_prev,
                time_slot=time_slot,
                estimated_cost=stop.estimated_cost or 0.0,
                is_break=False,
                notes=f"Transit: ~{transit_from_prev} min ({dist_from_prev} km)" if idx > 1 else "Starting activity"
            ))

            current_time_dt = departure_dt

        return RouteScheduleResponse(
            trip_id=trip_id,
            day_number=day_number,
            date=date_str,
            stops=scheduled_stops,
            total_distance_km=round(total_distance, 2),
            total_transit_minutes=total_transit,
            total_visit_minutes=total_visit,
            breaks=breaks,
            optimization_method="nearest_neighbor_with_2opt",
            distance_calculation_source="haversine_approximation",
            warnings=warnings
        )

    @staticmethod
    def _parse_time(time_str: str) -> datetime:
        base = datetime(2026, 1, 1)
        try:
            parts = time_str.split(":")
            return base.replace(hour=int(parts[0]), minute=int(parts[1]), second=0)
        except Exception:
            return base.replace(hour=9, minute=0, second=0)

    @staticmethod
    def _classify_time_slot(dt: datetime) -> str:
        h = dt.hour
        if h < 12:
            return "morning"
        elif h < 17:
            return "afternoon"
        return "evening"
