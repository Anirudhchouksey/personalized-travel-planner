"""
Integration tests for FastAPI Route Optimization and Scheduling endpoints.
"""
import pytest
from fastapi.testclient import TestClient

def test_routes_optimize_endpoint(client: TestClient):
    """Verify POST /api/v1/routes/optimize orders stops and returns legs."""
    payload = {
        "stops": [
            {"id": "stop-1", "name": "Stop A", "latitude": 37.77, "longitude": -122.41, "duration_minutes": 60},
            {"id": "stop-2", "name": "Stop B", "latitude": 37.80, "longitude": -122.42, "duration_minutes": 90},
            {"id": "stop-3", "name": "Stop C", "latitude": 37.78, "longitude": -122.40, "duration_minutes": 45}
        ],
        "travel_pace": "moderate",
        "transit_mode": "driving"
    }

    res = client.post("/api/v1/routes/optimize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["optimized_stops"]) == 3
    assert len(data["legs"]) == 2
    assert data["distance_source"] == "haversine_approximation"

def test_routes_schedule_endpoint(client: TestClient):
    """Verify POST /api/v1/routes/schedule generates timed schedule with comparison."""
    payload = {
        "stops": [
            {"id": "s1", "name": "Colosseum", "latitude": 41.8902, "longitude": 12.4922, "duration_minutes": 120},
            {"id": "s2", "name": "Pantheon", "latitude": 41.8986, "longitude": 12.4769, "duration_minutes": 60},
            {"id": "s3", "name": "Vatican", "latitude": 41.9029, "longitude": 12.4534, "duration_minutes": 180}
        ],
        "travel_pace": "moderate",
        "day_start_time": "09:00"
    }

    res = client.post("/api/v1/routes/schedule", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["stops"]) == 3
    assert data["stops"][0]["start_time"] == "09:00"
    assert data["total_distance_km"] > 0
    assert data["comparison"] is not None

def test_routes_compare_endpoint(client: TestClient):
    """Verify POST /api/v1/routes/compare computes difference metrics."""
    orig = [
        {"id": "1", "name": "Start", "latitude": 0.0, "longitude": 0.0},
        {"id": "2", "name": "Far", "latitude": 2.0, "longitude": 0.0},
        {"id": "3", "name": "Middle", "latitude": 1.0, "longitude": 0.0}
    ]
    opt = [
        {"id": "1", "name": "Start", "latitude": 0.0, "longitude": 0.0},
        {"id": "3", "name": "Middle", "latitude": 1.0, "longitude": 0.0},
        {"id": "2", "name": "Far", "latitude": 2.0, "longitude": 0.0}
    ]

    res = client.post("/api/v1/routes/compare", json={
        "original_stops": orig,
        "optimized_stops": opt
    })
    assert res.status_code == 200
    comp = res.json()
    assert comp["distance_saved_km"] > 0
    assert comp["distance_improvement_pct"] is not None

def test_trip_itinerary_optimize_lifecycle(client: TestClient):
    """Verify POST /api/v1/itineraries/{trip_id}/optimize and GET /optimized."""
    # 1. Create a trip
    trip_res = client.post("/api/v1/trips", json={
        "title": "Florence Art Weekend",
        "destination": "Florence, Italy",
        "start_date": "2026-10-01",
        "end_date": "2026-10-02"
    })
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    # 2. Generate initial itinerary
    gen_res = client.post("/api/v1/itineraries/generate", json={
        "trip_id": trip_id,
        "provider_override": "mock"
    })
    assert gen_res.status_code == 201

    # 3. Optimize trip itinerary
    opt_res = client.post(f"/api/v1/itineraries/{trip_id}/optimize")
    assert opt_res.status_code == 200
    opt_data = opt_res.json()
    assert opt_data["trip_id"] == trip_id

    # 4. Get optimized itinerary
    get_res = client.get(f"/api/v1/itineraries/{trip_id}/optimized")
    assert get_res.status_code == 200
    assert get_res.json()["trip_id"] == trip_id

def test_optimize_nonexistent_trip(client: TestClient):
    """Verify 404 for unknown trip ID."""
    res = client.post("/api/v1/itineraries/nonexistent-trip-999/optimize")
    assert res.status_code == 404
