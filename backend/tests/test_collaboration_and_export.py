"""
Integration tests for Trip Collaboration and Multi-Format Exports:
- Collaborator invite, list, role update, and removal
- Multi-format itinerary exports: PDF, Markdown, iCalendar (.ics), JSON
"""
import pytest
from fastapi.testclient import TestClient

def test_collaborator_management_lifecycle(client: TestClient):
    # 1. Create a trip
    trip_payload = {
        "title": "Group Expedition to Iceland",
        "destination": "Reykjavik, Iceland",
        "start_date": "2026-09-15",
        "end_date": "2026-09-20",
        "traveler_count": 4,
        "budget_amount": 6000.0,
        "currency": "USD",
        "travel_preferences": {
            "travel_vibe": "adventure",
            "travel_pace": "moderate",
            "interests": ["waterfalls", "glaciers", "geothermal"]
        }
    }
    trip_res = client.post("/api/v1/trips", json=trip_payload)
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    # 2. Owner invites a collaborator
    invite_payload = {
        "email": "travelbuddy@wanderai.app",
        "role": "editor"
    }
    invite_res = client.post(f"/api/v1/trips/{trip_id}/collaborators", json=invite_payload)
    assert invite_res.status_code == 201
    collab = invite_res.json()
    assert collab["email"] == "travelbuddy@wanderai.app"
    assert collab["role"] == "editor"
    collab_id = collab["id"]

    # 3. List collaborators
    list_res = client.get(f"/api/v1/trips/{trip_id}/collaborators")
    assert list_res.status_code == 200
    collabs = list_res.json()
    assert len(collabs) >= 1
    assert any(c["id"] == collab_id for c in collabs)

    # 4. Update collaborator role
    patch_res = client.patch(f"/api/v1/trips/{trip_id}/collaborators/{collab_id}", json={"role": "viewer"})
    assert patch_res.status_code == 200
    assert patch_res.json()["role"] == "viewer"

    # 5. Remove collaborator
    del_res = client.delete(f"/api/v1/trips/{trip_id}/collaborators/{collab_id}")
    assert del_res.status_code == 204

    # 6. Verify removed
    list_after = client.get(f"/api/v1/trips/{trip_id}/collaborators").json()
    assert not any(c["id"] == collab_id for c in list_after)


def test_multi_format_itinerary_exports(client: TestClient):
    # 1. Create trip and generate itinerary
    trip_res = client.post("/api/v1/trips", json={
        "title": "Tokyo Food & Culture Tour",
        "destination": "Tokyo, Japan",
        "start_date": "2026-10-10",
        "end_date": "2026-10-13",
        "traveler_count": 2,
        "budget_amount": 2800.0,
        "travel_preferences": {"travel_vibe": "cultural", "interests": ["sushi", "temples"]}
    })
    trip_id = trip_res.json()["id"]

    gen_res = client.post("/api/v1/itineraries/generate", json={
        "trip_id": trip_id,
        "provider_override": "mock"
    })
    assert gen_res.status_code == 201
    itin_id = gen_res.json()["id"]

    # 2. Test PDF Export
    pdf_res = client.post(f"/api/v1/itineraries/{itin_id}/export?format=pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert len(pdf_res.content) > 100

    # 3. Test Markdown Export
    md_res = client.post(f"/api/v1/itineraries/{itin_id}/export?format=markdown")
    assert md_res.status_code == 200
    assert "text/markdown" in md_res.headers["content-type"]
    md_text = md_res.content.decode("utf-8")
    assert "# Tokyo Food & Culture Tour" in md_text
    assert "Day 1" in md_text

    # 4. Test iCalendar (.ics) Export
    ics_res = client.post(f"/api/v1/itineraries/{itin_id}/export?format=ics")
    assert ics_res.status_code == 200
    assert "text/calendar" in ics_res.headers["content-type"]
    ics_text = ics_res.content.decode("utf-8")
    assert "BEGIN:VCALENDAR" in ics_text
    assert "END:VCALENDAR" in ics_text

    # 5. Test JSON Export
    json_res = client.post(f"/api/v1/itineraries/{itin_id}/export?format=json")
    assert json_res.status_code == 200
    assert "application/json" in json_res.headers["content-type"]
    json_data = json_res.json()
    assert "trip" in json_data
    assert "itinerary" in json_data
