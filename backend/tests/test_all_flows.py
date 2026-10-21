import pytest
from fastapi.testclient import TestClient

def test_health_endpoints(client: TestClient):
    # 1. Test root health
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "app" in data

    # 2. Test AI health
    res_ai = client.get("/api/v1/health/ai")
    assert res_ai.status_code == 200
    ai_data = res_ai.json()
    assert "active_provider" in ai_data
    assert "providers" in ai_data
    assert "mock" in ai_data["providers"]

def test_trip_crud_and_validation(client: TestClient):
    # 1. Invalid date validation (end_date before start_date)
    bad_trip_payload = {
        "title": "Invalid Trip",
        "destination": "Kyoto, Japan",
        "start_date": "2026-11-10",
        "end_date": "2026-11-05",  # earlier!
        "traveler_count": 2,
        "budget_amount": 2000.0,
        "currency": "USD"
    }
    res_bad = client.post("/api/v1/trips", json=bad_trip_payload)
    assert res_bad.status_code == 422

    # 2. Valid trip creation
    good_trip_payload = {
        "title": "Autumn in Kyoto",
        "origin": "San Francisco",
        "destination": "Kyoto, Japan",
        "start_date": "2026-11-01",
        "end_date": "2026-11-04",
        "traveler_count": 2,
        "budget_amount": 3000.0,
        "currency": "USD",
        "travel_preferences": {
            "travel_vibe": "cultural",
            "travel_pace": "moderate",
            "interests": ["temples", "tea ceremonies", "local markets"],
            "preferred_transportation": ["walking", "public_transit"],
            "dietary_requirements": ["vegetarian options"]
        }
    }
    res_create = client.post("/api/v1/trips", json=good_trip_payload)
    assert res_create.status_code == 201
    created_trip = res_create.json()
    trip_id = created_trip["id"]
    assert created_trip["title"] == "Autumn in Kyoto"

    # 3. Retrieve trips list
    res_list = client.get("/api/v1/trips")
    assert res_list.status_code == 200
    trips = res_list.json()
    assert any(t["id"] == trip_id for t in trips)

    # 4. Patch trip
    res_patch = client.patch(f"/api/v1/trips/{trip_id}", json={"title": "Updated Kyoto Journey"})
    assert res_patch.status_code == 200
    assert res_patch.json()["title"] == "Updated Kyoto Journey"

    # 5. Generate AI Itinerary
    res_gen = client.post(f"/api/v1/trips/{trip_id}/generate", json={"provider_override": "mock"})
    assert res_gen.status_code == 200
    itin = res_gen.json()
    assert itin["trip_id"] == trip_id
    assert len(itin["days"]) > 0

    first_day = itin["days"][0]
    day_id = first_day["id"]
    assert len(first_day["activities"]) > 0

    # 6. Regenerate single day with feedback
    res_regen_day = client.post(
        f"/api/v1/itineraries/{itin['id']}/days/{day_id}/regenerate",
        json={"feedback": "Make this day more focused on artisan matcha tea and low walking"}
    )
    assert res_regen_day.status_code == 200
    updated_day = res_regen_day.json()
    assert updated_day["id"] == day_id
    assert len(updated_day["activities"]) > 0

    # 7. Test PDF Export
    res_export = client.post(f"/api/v1/itineraries/{itin['id']}/export")
    assert res_export.status_code == 200
    assert res_export.headers["content-type"] == "application/pdf"
    assert res_export.content.startswith(b"%PDF")

    # 8. Test Share link creation & Public read
    res_share = client.post("/api/v1/shares", json={"trip_id": trip_id, "expires_in_days": 14})
    assert res_share.status_code == 201
    share_data = res_share.json()
    share_token = share_data["share_token"]
    share_id = share_data["id"]

    # Read shared trip publicly
    res_pub = client.get(f"/api/v1/shares/{share_token}")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["trip"]["id"] == trip_id
    assert pub_data["itinerary"] is not None

    # Revoke share
    res_revoke = client.delete(f"/api/v1/shares/{share_id}")
    assert res_revoke.status_code == 204

    # Verify public token no longer works
    res_revoked_pub = client.get(f"/api/v1/shares/{share_token}")
    assert res_revoked_pub.status_code == 404

    # 9. Delete Trip
    res_del = client.delete(f"/api/v1/trips/{trip_id}")
    assert res_del.status_code == 204

def test_destination_recommendations(client: TestClient):
    payload = {
        "travel_vibe": "cultural",
        "budget_amount": 2500.0,
        "currency": "USD",
        "duration_days": 7,
        "traveler_count": 2,
        "interests": ["history", "gastronomy", "museums"]
    }
    res = client.post("/api/v1/recommendations/destinations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) >= 1
    first = data["recommendations"][0]
    assert "destination" in first
    assert "match_score" in first
    assert first["match_score"] >= 60
