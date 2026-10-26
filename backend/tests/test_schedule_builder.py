"""
Unit tests for ScheduleBuilder:
Pacing modes, chronological timings, lunch break insertions, and constraint warnings.
"""
from app.schemas.route import RouteStopInput, RouteLeg
from app.services.schedule_builder import ScheduleBuilder

def test_schedule_timings_and_break_insertion():
    """Verify stops receive sequential times and midday meal break is inserted."""
    stops = [
        RouteStopInput(id="s1", name="Morning Landmark", duration_minutes=120),
        RouteStopInput(id="s2", name="Afternoon Gallery", duration_minutes=90),
        RouteStopInput(id="s3", name="Evening Viewpoint", duration_minutes=60)
    ]
    legs = [
        RouteLeg(from_stop_id="s1", to_stop_id="s2", distance_km=3.0, transit_minutes=15),
        RouteLeg(from_stop_id="s2", to_stop_id="s3", distance_km=2.0, transit_minutes=10)
    ]

    schedule = ScheduleBuilder.build_schedule(
        stops=stops,
        legs=legs,
        travel_pace="moderate",
        day_start_time="09:30"
    )

    assert len(schedule.stops) == 3
    # Check stop 1 starts at 09:30 and ends at 11:30
    assert schedule.stops[0].start_time == "09:30"
    assert schedule.stops[0].end_time == "11:30"

    # Midday break should be scheduled around noon/lunch
    assert len(schedule.breaks) >= 1
    assert schedule.breaks[0]["type"] == "meal"

def test_pacing_mode_warnings_for_too_many_stops():
    """Verify warning is issued if relaxed pace exceeds 3 stops."""
    stops = [
        RouteStopInput(id=f"s{i}", name=f"Stop {i}", duration_minutes=60)
        for i in range(1, 6)
    ]
    schedule = ScheduleBuilder.build_schedule(
        stops=stops,
        legs=[],
        travel_pace="relaxed"
    )

    assert any("exceeds recommended pace" in w for w in schedule.warnings)

def test_time_window_conflict_warning():
    """Verify warning when arrival time is past stop window end."""
    stops = [
        RouteStopInput(id="s1", name="Long Morning Tour", duration_minutes=300),
        RouteStopInput(id="s2", name="Morning Only Market", duration_minutes=60, time_window_end="11:00")
    ]
    schedule = ScheduleBuilder.build_schedule(
        stops=stops,
        legs=[],
        day_start_time="09:00"
    )

    assert any("preferred window end" in w for w in schedule.warnings)
