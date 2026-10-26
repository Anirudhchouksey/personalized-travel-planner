import pytest
from unittest.mock import patch
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import AuthenticatedUser, get_current_user
from app.services.ai.mock_provider import MockProvider
from app.services.itinerary_service import ItineraryService
from app.db.repository import (
    repository,
    _mem_trips,
    _mem_itineraries,
    _mem_days,
    _mem_activities,
    _mem_shares,
    _mem_collaborators,
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_in_memory_db():
    _mem_trips.clear()
    _mem_itineraries.clear()
    _mem_days.clear()
    _mem_activities.clear()
    _mem_shares.clear()
    _mem_collaborators.clear()

def test_liveness_and_readiness_probes():
    """Verify /health, /live, and /ready probes return correct HTTP 200 payload."""
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_live = client.get("/live")
    assert res_live.status_code == 200
    assert "uptime_seconds" in res_live.json()

    res_ready = client.get("/ready")
    assert res_ready.status_code == 200
    data = res_ready.json()
    assert data["status"] == "ready"
    assert "database" in data
    assert "ai_providers" in data

def test_trip_creation_validation_bounds():
    """Verify backend enforces strict Pydantic validation on trip inputs."""
    # 1. Invalid date range (end before start)
    res_invalid_dates = client.post(
        "/api/v1/trips",
        json={
            "title": "Invalid Dates Trip",
            "destination": "Rome, Italy",
            "start_date": "2026-11-10",
            "end_date": "2026-11-05",
            "traveler_count": 2,
            "budget_amount": 1000,
        },
        headers={"X-User-Id": "test-user-prod"}
    )
    assert res_invalid_dates.status_code == 422

    # 2. Invalid traveler count (< 1)
    res_invalid_travelers = client.post(
        "/api/v1/trips",
        json={
            "destination": "Rome, Italy",
            "start_date": "2026-11-01",
            "end_date": "2026-11-05",
            "traveler_count": 0,
            "budget_amount": 1000,
        },
        headers={"X-User-Id": "test-user-prod"}
    )
    assert res_invalid_travelers.status_code == 422

    # 3. Invalid budget (< 0)
    res_invalid_budget = client.post(
        "/api/v1/trips",
        json={
            "destination": "Rome, Italy",
            "start_date": "2026-11-01",
            "end_date": "2026-11-05",
            "traveler_count": 2,
            "budget_amount": -500,
        },
        headers={"X-User-Id": "test-user-prod"}
    )
    assert res_invalid_budget.status_code == 422

@pytest.mark.asyncio
async def test_itinerary_preservation_on_failed_regeneration():
    """Verify that if an AI regeneration encounters an error, existing itinerary is not lost."""
    # Create valid trip
    trip = await repository.create_trip(
        user_id="test-user-resilience",
        trip_data={
            "title": "Florence Art Tour",
            "destination": "Florence, Italy",
            "start_date": "2026-11-01",
            "end_date": "2026-11-03",
            "traveler_count": 2,
            "budget_amount": 2000,
            "currency": "EUR",
            "travel_preferences": {
                "travel_vibe": "cultural",
                "travel_pace": "moderate",
                "interests": ["Museums", "Tuscan Wine"],
            }
        }
    )

    service = ItineraryService(provider=MockProvider())
    itin = await service.generate_for_trip(trip["id"], "test-user-resilience")
    assert itin is not None
    assert len(itin.days) >= 2

    # Simulate provider failure during regeneration
    class FailingProvider:
        name = "failing-provider"
        async def generate_structured(self, **kwargs):
            raise RuntimeError("Temporary provider rate limit / upstream timeout")

    failing_service = ItineraryService(provider=FailingProvider())

    with patch("app.services.ai.mock_provider.MockProvider.generate_structured", side_effect=RuntimeError("Fallback failure")):
        with pytest.raises(Exception):
            await failing_service.regenerate_for_trip(trip["id"], "test-user-resilience", feedback="Make day 2 relaxed")

    # Check that previous itinerary remains active and untouched
    persisted_itin = await repository.get_itinerary_by_id(itin.id)
    assert persisted_itin is not None
    assert len(persisted_itin.get("days", [])) >= 2

def test_unauthorized_trip_access():
    """Verify unauthorized users cannot fetch another user's private trip."""
    # Create trip for user A
    res_create = client.post(
        "/api/v1/trips",
        json={
            "destination": "Barcelona, Spain",
            "start_date": "2026-11-01",
            "end_date": "2026-11-04",
            "traveler_count": 1,
            "budget_amount": 1200,
        }
    )
    assert res_create.status_code in (200, 201)
    trip_id = res_create.json()["id"]

    # Switch authenticated user to stranger
    async def stranger_user():
        return AuthenticatedUser(user_id="user-stranger-uuid-999", email="stranger@example.com")

    from tests.conftest import override_get_current_user
    app.dependency_overrides[get_current_user] = stranger_user

    try:
        # User B attempts to access trip directly
        res_unauth = client.get(f"/api/v1/trips/{trip_id}")
        assert res_unauth.status_code in (403, 404)
    finally:
        app.dependency_overrides[get_current_user] = override_get_current_user
