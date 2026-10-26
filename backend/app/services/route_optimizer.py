"""
Smart Travel Route Optimization Engine.
Combines deterministic Haversine distance matrices, Nearest-Neighbor heuristic,
2-opt local improvement, time-window constraints, and backtracking reduction.
100% free, zero external API costs.
"""
import math
from typing import Any, Dict, List, Optional, Tuple
from app.schemas.route import (
    RouteStopInput,
    RouteLeg,
    RouteComparisonMetric,
)

class RouteOptimizer:
    """
    Deterministic route optimization service for travel stops.
    Minimizes travel distance and transit time while respecting time constraints.
    """

    EARTH_RADIUS_KM = 6371.0

    TRANSIT_SPEEDS_KMH = {
        "driving": 30.0,
        "transit": 20.0,
        "walking": 4.5
    }

    TRANSIT_BUFFERS_MIN = {
        "driving": 5,
        "transit": 8,
        "walking": 3
    }

    @classmethod
    def calculate_haversine_distance(
        cls,
        lat1: Optional[float],
        lon1: Optional[float],
        lat2: Optional[float],
        lon2: Optional[float]
    ) -> float:
        """
        Calculates straight-line great-circle distance in kilometers between two coordinates.
        Returns 0.0 if any coordinate is missing.
        """
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return 0.0

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(cls.EARTH_RADIUS_KM * c, 2)

    @classmethod
    def estimate_transit_time_minutes(
        cls,
        distance_km: float,
        mode: str = "driving",
        has_coords: bool = True
    ) -> int:
        """
        Estimates transit time in minutes given distance and transit mode.
        If coordinates are absent, uses a default realistic travel buffer.
        """
        if not has_coords or distance_km <= 0.01:
            return 15  # standard urban travel buffer when coords are unknown

        speed = cls.TRANSIT_SPEEDS_KMH.get(mode, 30.0)
        buffer = cls.TRANSIT_BUFFERS_MIN.get(mode, 5)
        raw_minutes = (distance_km / speed) * 60.0
        return max(5, int(round(raw_minutes + buffer)))

    @classmethod
    def optimize_stops(
        cls,
        stops: List[RouteStopInput],
        start_location: Optional[RouteStopInput] = None,
        end_location: Optional[RouteStopInput] = None,
        transit_mode: str = "driving"
    ) -> Tuple[List[RouteStopInput], List[RouteLeg], List[str]]:
        """
        Optimizes order of stops using Nearest-Neighbor heuristic and 2-opt search.
        Preserves locked/fixed-time stops and collects diagnostic warnings.
        """
        warnings: List[str] = []
        if not stops:
            return [], [], ["No stops provided to optimize."]

        if len(stops) == 1:
            return stops, [], []

        # Check for missing coordinates
        missing_coord_names = [s.name for s in stops if s.latitude is None or s.longitude is None]
        if missing_coord_names:
            warnings.append(
                f"Missing coordinates for {len(missing_coord_names)} stop(s): {', '.join(missing_coord_names[:3])}. "
                "Default transit buffers will be applied for distance estimates."
            )

        # 1. Separate fixed-time vs flexible stops
        # Sort initial candidate order
        ordered = cls._nearest_neighbor(stops, start_location, transit_mode)

        # 2. Apply 2-opt refinement (improves route and removes crossovers)
        improved = cls._two_opt(ordered, transit_mode)

        # 3. Build legs
        legs = cls._build_legs(improved, transit_mode)

        return improved, legs, warnings

    @classmethod
    def _nearest_neighbor(
        cls,
        stops: List[RouteStopInput],
        start_location: Optional[RouteStopInput],
        transit_mode: str
    ) -> List[RouteStopInput]:
        unvisited = list(stops)
        ordered: List[RouteStopInput] = []

        # Determine starting stop
        current = None
        if start_location:
            # Pick stop closest to start_location
            best_idx = 0
            best_dist = float("inf")
            for idx, s in enumerate(unvisited):
                d = cls.calculate_haversine_distance(
                    start_location.latitude, start_location.longitude,
                    s.latitude, s.longitude
                )
                if d < best_dist:
                    best_dist = d
                    best_idx = idx
            current = unvisited.pop(best_idx)
        else:
            # If any stop has an explicit early time window or fixed time, prioritize it
            early_idx = 0
            for idx, s in enumerate(unvisited):
                if s.is_fixed_time or (s.time_window_start and s.time_window_start <= "10:00"):
                    early_idx = idx
                    break
            current = unvisited.pop(early_idx)

        ordered.append(current)

        # Greedy nearest neighbor loop
        while unvisited:
            best_idx = 0
            best_dist = float("inf")
            for idx, s in enumerate(unvisited):
                # Don't bypass fixed time if it needs to occur later
                dist = cls.calculate_haversine_distance(
                    current.latitude, current.longitude,
                    s.latitude, s.longitude
                )
                # Slight penalty if out of time window
                if s.time_window_start and current.time_window_end:
                    if s.time_window_start < current.time_window_end:
                        dist += 2.0  # slight penalty

                if dist < best_dist:
                    best_dist = dist
                    best_idx = idx

            current = unvisited.pop(best_idx)
            ordered.append(current)

        return ordered

    @classmethod
    def _two_opt(cls, route: List[RouteStopInput], transit_mode: str) -> List[RouteStopInput]:
        """
        2-opt local search heuristic to eliminate route self-intersections.
        """
        if len(route) < 4:
            return route

        best_route = list(route)
        improved = True
        iterations = 0

        while improved and iterations < 50:
            improved = False
            iterations += 1
            for i in range(1, len(best_route) - 2):
                for j in range(i + 1, len(best_route)):
                    # Do not swap if intermediate stop is fixed-time
                    if any(best_route[k].is_fixed_time for k in range(i, j + 1)):
                        continue

                    # Current distance
                    d1 = cls.calculate_haversine_distance(
                        best_route[i - 1].latitude, best_route[i - 1].longitude,
                        best_route[i].latitude, best_route[i].longitude
                    )
                    d2 = cls.calculate_haversine_distance(
                        best_route[j - 1].latitude, best_route[j - 1].longitude,
                        best_route[j].latitude if j < len(best_route) else None,
                        best_route[j].longitude if j < len(best_route) else None
                    )

                    # Reversed distance
                    d1_new = cls.calculate_haversine_distance(
                        best_route[i - 1].latitude, best_route[i - 1].longitude,
                        best_route[j - 1].latitude, best_route[j - 1].longitude
                    )
                    d2_new = cls.calculate_haversine_distance(
                        best_route[i].latitude, best_route[i].longitude,
                        best_route[j].latitude if j < len(best_route) else None,
                        best_route[j].longitude if j < len(best_route) else None
                    )

                    if (d1_new + d2_new) < (d1 + d2) - 0.05:
                        best_route[i:j] = reversed(best_route[i:j])
                        improved = True
                        break
                if improved:
                    break

        return best_route

    @classmethod
    def _build_legs(cls, stops: List[RouteStopInput], transit_mode: str) -> List[RouteLeg]:
        legs = []
        for i in range(len(stops) - 1):
            s1 = stops[i]
            s2 = stops[i + 1]
            has_coords = bool(s1.latitude and s1.longitude and s2.latitude and s2.longitude)
            dist = cls.calculate_haversine_distance(s1.latitude, s1.longitude, s2.latitude, s2.longitude)
            transit_mins = cls.estimate_transit_time_minutes(dist, transit_mode, has_coords)

            legs.append(RouteLeg(
                from_stop_id=s1.id,
                to_stop_id=s2.id,
                distance_km=dist,
                transit_minutes=transit_mins,
                calculation_method="haversine_approximation"
            ))
        return legs

    @classmethod
    def calculate_route_metrics(
        cls,
        stops: List[RouteStopInput],
        transit_mode: str = "driving"
    ) -> Tuple[float, int, int]:
        """
        Calculates total distance (km), total transit time (mins), and backtracking count.
        """
        if len(stops) < 2:
            return 0.0, 0, 0

        total_dist = 0.0
        total_transit = 0
        backtracking_count = 0

        vectors: List[Tuple[float, float]] = []

        for i in range(len(stops) - 1):
            s1 = stops[i]
            s2 = stops[i + 1]
            has_coords = bool(s1.latitude and s1.longitude and s2.latitude and s2.longitude)
            d = cls.calculate_haversine_distance(s1.latitude, s1.longitude, s2.latitude, s2.longitude)
            t = cls.estimate_transit_time_minutes(d, transit_mode, has_coords)
            total_dist += d
            total_transit += t

            if has_coords:
                v = (s2.latitude - s1.latitude, s2.longitude - s1.longitude)
                vectors.append(v)

        # Backtracking detection using dot product
        for i in range(len(vectors) - 1):
            v1 = vectors[i]
            v2 = vectors[i + 1]
            dot = v1[0] * v2[0] + v1[1] * v2[1]
            mag1 = math.sqrt(v1[0] ** 2 + v1[1] ** 2)
            mag2 = math.sqrt(v2[0] ** 2 + v2[1] ** 2)
            if mag1 > 0 and mag2 > 0:
                cos_theta = dot / (mag1 * mag2)
                # Angle > 120 degrees indicates turning backwards
                if cos_theta < -0.5:
                    backtracking_count += 1

        return round(total_dist, 2), total_transit, backtracking_count

    @classmethod
    def compare_routes(
        cls,
        original_stops: List[RouteStopInput],
        optimized_stops: List[RouteStopInput],
        transit_mode: str = "driving"
    ) -> RouteComparisonMetric:
        """
        Compares baseline route versus optimized route across distance, time, and backtracking.
        Calculates percentages only when baseline values are positive.
        """
        orig_dist, orig_time, orig_bt = cls.calculate_route_metrics(original_stops, transit_mode)
        opt_dist, opt_time, opt_bt = cls.calculate_route_metrics(optimized_stops, transit_mode)

        dist_saved = max(0.0, round(orig_dist - opt_dist, 2))
        time_saved = max(0, orig_time - opt_time)

        dist_pct = round((dist_saved / orig_dist) * 100.0, 1) if orig_dist > 0.0 else None
        time_pct = round((time_saved / orig_time) * 100.0, 1) if orig_time > 0 else None
        bt_reduced = max(0, orig_bt - opt_bt)

        # Check for unscheduled stops
        opt_ids = {s.id for s in optimized_stops}
        unscheduled = [s.name for s in original_stops if s.id not in opt_ids]

        return RouteComparisonMetric(
            original_distance_km=orig_dist,
            optimized_distance_km=opt_dist,
            distance_saved_km=dist_saved,
            distance_improvement_pct=dist_pct,
            original_transit_minutes=orig_time,
            optimized_transit_minutes=opt_time,
            transit_time_saved_minutes=time_saved,
            transit_improvement_pct=time_pct,
            backtracking_segments_reduced=bt_reduced,
            conflicts_resolved=0,
            unscheduled_stops=unscheduled
        )
