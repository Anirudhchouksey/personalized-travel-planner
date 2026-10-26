"""
Automated integration tests for FastAPI Itinerary endpoints:
POST /generate, GET /{trip_id}, PUT /{trip_id}, POST /{trip_id}/regenerate, GET /{trip_id}/days/{day_number}.
"""
import pytest
from fastapi.testclient import TestClient

def test_itinerary_endpoints_full_lifecycle(client: TestClient):
    """
    Tests complete lifecycle:
    1. Create a trip
    2. POST /api/v1/itineraries/generate
    3. GET /api/v1/itineraries/{trip_id}
    4. GET /api/v1/itineraries/{trip_id}/days/1
    5. POST /api/v1/itineraries/{trip_id}/regenerate
    6. PUT /api/v1/itineraries/{trip_id}
    """
    # 1. Create a trip
    trip_payload = {
        "title": "Amsterdam Holiday",
        "destination": "Amsterdam, Netherlands",
        "start_date": "2026-08-10",
        "end_date": "2026-08-12",
        "traveler_count": 2,
        "budget_amount": 1200.0,
        "travel_preferences": {
            "travel_style": "couple",
            "interests": ["museums", "canals", "food"],
            "pace": "moderate"
        }
    }
    trip_res = client.post("/api/v1/trips", json=trip_payload)
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    # 2. POST /api/v1/itineraries/generate
    gen_res = client.post("/api/v1/itineraries/generate", json={
        "trip_id": trip_id,
        "provider_override": "mock"
    })
    assert gen_res.status_code == 201
    itin_data = gen_res.json()
    assert itin_data["trip_id"] == trip_id
    assert len(itin_data["days"]) == 3
    assert itin_data["days"][0]["day_number"] == 1
    assert len(itin_data["days"][0]["activities"]) > 0

    # 3. GET /api/v1/itineraries/{trip_id}
    get_res = client.get(f"/api/v1/itineraries/{trip_id}")
    assert get_res.status_code == 200
    assert get_res.json()["trip_id"] == trip_id

    # 4. GET /api/v1/itineraries/{trip_id}/days/1
    day_res = client.get(f"/api/v1/itineraries/{trip_id}/days/1")
    assert day_res.status_code == 200
    day_data = day_res.json()
    assert day_data["day_number"] == 1
    assert len(day_data["activities"]) > 0

    # 5. POST /api/v1/itineraries/{trip_id}/regenerate
    regen_res = client.post(f"/api/v1/itineraries/{trip_id}/regenerate", json={
        "feedback": "More focus on cycling routes and canal tours",
        "preserve_days": []
    })
    assert regen_res.status_code == 200
    assert regen_res.json()["trip_id"] == trip_id

    # 6. PUT /api/v1/itineraries/{trip_id}
    put_res = client.put(f"/api/v1/itineraries/{trip_id}", json={
        "generation_provider": "gemini-flash"
    })
    assert put_res.status_code == 200

def test_itinerary_generate_missing_trip_id(client: TestClient):
    """Verify 400 Bad Request if trip_id is missing."""
    res = client.post("/api/v1/itineraries/generate", json={})
    assert res.status_code == 400
    assert "trip_id" in res.json()["detail"]

def test_itinerary_get_nonexistent_trip(client: TestClient):
    """Verify 404 Not Found for non-existent trip."""
    res = client.get("/api/v1/itineraries/nonexistent-trip-id-999")
    assert res.status_code == 404
