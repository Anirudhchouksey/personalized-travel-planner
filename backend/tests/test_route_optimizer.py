"""
Unit tests for RouteOptimizer:
Haversine calculations, Nearest-Neighbor + 2-opt, missing coordinates,
fixed-time preservation, and backtracking calculations.
Runs 100% offline and free.
"""
import pytest
from app.schemas.route import RouteStopInput
from app.services.route_optimizer import RouteOptimizer

def test_haversine_distance_accuracy():
    """Verify great-circle distance between known landmarks (e.g. Tokyo Tower to Senso-ji)."""
    # Tokyo Tower: 35.6586, 139.7454
    # Senso-ji: 35.7148, 139.7967
    dist = RouteOptimizer.calculate_haversine_distance(35.6586, 139.7454, 35.7148, 139.7967)
    # Expected distance is ~7.8 km
    assert 7.0 <= dist <= 8.5

def test_haversine_missing_coordinates():
    """Verify missing coordinates return 0.0 without throwing errors."""
    dist = RouteOptimizer.calculate_haversine_distance(None, 139.7454, 35.7148, None)
    assert dist == 0.0

def test_single_and_empty_stops():
    """Verify empty and single-stop routes return gracefully."""
    stops, legs, warnings = RouteOptimizer.optimize_stops([])
    assert stops == []
    assert len(warnings) > 0

    single = [RouteStopInput(id="s1", name="Eiffel Tower", latitude=48.8584, longitude=2.2945)]
    stops, legs, warnings = RouteOptimizer.optimize_stops(single)
    assert len(stops) == 1
    assert legs == []

def test_route_ordering_and_backtracking_reduction():
    """
    Test 4 stops arranged in a line: A (lat 0.0), B (lat 1.0), C (lat 2.0), D (lat 3.0).
    Given un-optimized sequence: A -> D -> B -> C (backtracking zig-zag),
    Optimization should re-order into A -> B -> C -> D.
    """
    sA = RouteStopInput(id="A", name="Stop A", latitude=0.0, longitude=0.0)
    sB = RouteStopInput(id="B", name="Stop B", latitude=1.0, longitude=0.0)
    sC = RouteStopInput(id="C", name="Stop C", latitude=2.0, longitude=0.0)
    sD = RouteStopInput(id="D", name="Stop D", latitude=3.0, longitude=0.0)

    unoptimized = [sA, sD, sB, sC]
    optimized, legs, warnings = RouteOptimizer.optimize_stops(
        stops=unoptimized,
        start_location=sA
    )

    opt_ids = [s.id for s in optimized]
    assert opt_ids == ["A", "B", "C", "D"]
    assert len(legs) == 3

    # Compare metrics
    comparison = RouteOptimizer.compare_routes(unoptimized, optimized)
    assert comparison.distance_saved_km > 0.0
    assert comparison.distance_improvement_pct is not None
    assert comparison.distance_improvement_pct > 0.0

def test_fixed_time_stop_preservation():
    """Verify locked / fixed-time stops are respected during optimization."""
    s1 = RouteStopInput(id="1", name="Museum", latitude=40.71, longitude=-74.00)
    s2 = RouteStopInput(id="2", name="Locked Lunch", latitude=40.75, longitude=-73.98, is_fixed_time=True)
    s3 = RouteStopInput(id="3", name="Park", latitude=40.78, longitude=-73.96)

    optimized, legs, _ = RouteOptimizer.optimize_stops([s1, s2, s3])
    assert len(optimized) == 3
    # s2 must still be present
    assert any(s.id == "2" for s in optimized)
