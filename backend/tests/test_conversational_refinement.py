"""
Tests for Conversational Itinerary Refinement and Snapshot Versioning:
- POST /api/v1/itineraries/{trip_id}/refine
- Preservation of locked activities during refinement
- GET /api/v1/itineraries/{trip_id}/versions
- POST /api/v1/itineraries/{trip_id}/versions/{version}/restore
- GET /api/v1/itineraries/{trip_id}/versions/{version}
"""
import pytest
from fastapi.testclient import TestClient

def test_conversational_refinement_and_versioning_lifecycle(client: TestClient):
    # 1. Create a trip
    trip_payload = {
        "title": "Kyoto Cultural Journey",
        "destination": "Kyoto, Japan",
        "start_date": "2026-11-01",
        "end_date": "2026-11-03",
        "traveler_count": 2,
        "budget_amount": 2500.0,
        "travel_preferences": {
            "travel_style": "cultural",
            "interests": ["temples", "tea ceremony", "gardens"],
            "pace": "moderate"
        }
    }
    trip_res = client.post("/api/v1/trips", json=trip_payload)
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    # 2. Generate initial itinerary
    gen_res = client.post("/api/v1/itineraries/generate", json={
        "trip_id": trip_id,
        "provider_override": "mock"
    })
    assert gen_res.status_code == 201
    itin_data = gen_res.json()
    assert itin_data["trip_id"] == trip_id
    assert len(itin_data["days"]) == 3
    initial_version = itin_data.get("version", 1)

    # Pick an activity to lock
    first_activity = itin_data["days"][0]["activities"][0]
    locked_act_id = str(first_activity["id"])

    # 3. Refine itinerary conversationally
    refine_payload = {
        "message": "Make day 1 more relaxed and add traditional matcha tasting in the afternoon.",
        "target_day": 1,
        "preserve_activity_ids": [locked_act_id],
        "conversation_history": [
            {"role": "user", "content": "I want something calm."},
            {"role": "assistant", "content": "Here is an immersive Kyoto schedule."}
        ]
    }
    refine_res = client.post(f"/api/v1/itineraries/{trip_id}/refine", json=refine_payload)
    assert refine_res.status_code == 200
    refine_data = refine_res.json()

    assert "itinerary" in refine_data
    assert "assistant_message" in refine_data
    assert "summary_of_changes" in refine_data
    assert refine_data["version"] > initial_version

    # Verify locked activity is preserved
    refined_day_1 = refine_data["itinerary"]["days"][0]
    act_ids_day_1 = [str(a["id"]) for a in refined_day_1["activities"]]
    assert locked_act_id in act_ids_day_1

    # 4. Fetch version list
    versions_res = client.get(f"/api/v1/itineraries/{trip_id}/versions")
    assert versions_res.status_code == 200
    versions_data = versions_res.json()
    assert versions_data["trip_id"] == trip_id
    assert len(versions_data["versions"]) >= 1
    # Check version items have required fields
    v_item = versions_data["versions"][0]
    assert "version" in v_item
    assert "created_at" in v_item
    assert "user_instruction" in v_item

    # 5. Fetch single version snapshot
    snapshot_res = client.get(f"/api/v1/itineraries/{trip_id}/versions/{v_item['version']}")
    assert snapshot_res.status_code == 200
    snapshot_data = snapshot_res.json()
    assert snapshot_data["version"] == v_item["version"]
    assert "itinerary_snapshot" in snapshot_data

    # 6. Restore to previous version
    restore_res = client.post(f"/api/v1/itineraries/{trip_id}/versions/{v_item['version']}/restore")
    assert restore_res.status_code == 200
    restored_data = restore_res.json()
    assert restored_data["trip_id"] == trip_id
    assert len(restored_data["days"]) == 3

def test_conversational_refine_nonexistent_trip(client: TestClient):
    res = client.post("/api/v1/itineraries/nonexistent-id-999/refine", json={
        "message": "Add a museum visit"
    })
    assert res.status_code == 404

def test_restore_nonexistent_version(client: TestClient):
    # Create trip and itinerary
    trip_res = client.post("/api/v1/trips", json={
        "title": "Short trip",
        "destination": "Paris",
        "start_date": "2026-09-01",
        "end_date": "2026-09-02",
        "traveler_count": 1,
        "budget_amount": 500.0,
        "travel_preferences": {}
    })
    trip_id = trip_res.json()["id"]
    client.post("/api/v1/itineraries/generate", json={"trip_id": trip_id, "provider_override": "mock"})

    # Try restoring version 9999
    res = client.post(f"/api/v1/itineraries/{trip_id}/versions/9999/restore")
    assert res.status_code == 404
