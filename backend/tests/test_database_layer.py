"""
Tests for Supabase Database Layer, Persistent Trip Storage & Repositories.
Covers:
- Database connection layer (get_client, get_service_client, is_database_connected)
- Trip repository & Trip service CRUD
- Business constraint enforcement (date bounds, traveler count >= 1, non-negative budget)
- Itinerary repository versioning and conversational refinement history
- FastAPI endpoints under both /api/v1/trips and /api/trips
"""
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.core.database import get_client, get_service_client, is_database_connected, reset_database_clients
from app.core.exceptions import ValidationError, AuthorizationError, EntityNotFoundError
from app.repositories.trip_repository import trip_repository
from app.repositories.itinerary_repository import itinerary_repository
from app.services.trip_service import trip_service
from app.schemas.trip import TripCreate, TripUpdate


def test_database_connection_layer():
    """Verify database connection helpers initialize safely without throwing unhandled exceptions."""
    reset_database_clients()
    client = get_client()
    service_client = get_service_client()
    # In test mode without live Supabase credentials, both return None safely
    connected = is_database_connected()
    assert isinstance(connected, bool)
    reset_database_clients()


@pytest.mark.asyncio
async def test_trip_service_constraint_validation():
    """Verify constraint validation on dates, traveler count, and budget."""
    today = date.today()
    yesterday = today - timedelta(days=1)

    # 1. End date before start date
    with pytest.raises(ValidationError) as exc:
        trip_service.validate_trip_constraints(
            start_date=today,
            end_date=yesterday,
            traveler_count=2,
            budget_amount=500.0
        )
    assert "return date must be on or after" in str(exc.value)

    # 2. Traveler count < 1
    with pytest.raises(ValidationError) as exc:
        trip_service.validate_trip_constraints(
            start_date=today,
            end_date=today + timedelta(days=3),
            traveler_count=0,
            budget_amount=500.0
        )
    assert "Traveler count must be at least 1" in str(exc.value)

    # 3. Negative budget
    with pytest.raises(ValidationError) as exc:
        trip_service.validate_trip_constraints(
            start_date=today,
            end_date=today + timedelta(days=3),
            traveler_count=2,
            budget_amount=-50.0
        )
    assert "budget cannot be negative" in str(exc.value)


@pytest.mark.asyncio
async def test_trip_service_crud_lifecycle():
    """Tests complete trip lifecycle through TripService and TripRepository."""
    user_id = "test-user-db-1"
    other_user_id = "unauthorized-user-99"

    # 1. Create trip
    payload = TripCreate(
        title="Bespoke Venice Escape",
        destination="Venice, Italy",
        start_date=date(2026, 9, 10),
        end_date=date(2026, 9, 15),
        traveler_count=2,
        budget_amount=3000.0,
        currency="EUR",
        travel_preferences={
            "travel_vibe": "romantic",
            "travel_pace": "relaxed",
            "interests": ["gondola", "art", "canals"]
        }
    )
    created = await trip_service.create_trip(user_id=user_id, data=payload)
    trip_id = created["id"]
    assert created["title"] == "Bespoke Venice Escape"
    assert created["user_id"] == user_id

    # 2. Get trip as owner
    fetched = await trip_service.get_trip(trip_id=trip_id, user_id=user_id)
    assert fetched["id"] == trip_id

    # 3. Get trip as unauthorized user -> AuthorizationError
    with pytest.raises(AuthorizationError):
        await trip_service.get_trip(trip_id=trip_id, user_id=other_user_id)

    # 4. List trips for user
    user_trips = await trip_service.list_trips(user_id=user_id)
    assert any(t["id"] == trip_id for t in user_trips)

    # 5. Update trip
    update_data = TripUpdate(
        title="Updated Venice Dream",
        budget_amount=3500.0
    )
    updated = await trip_service.update_trip(trip_id=trip_id, user_id=user_id, data=update_data)
    assert updated["title"] == "Updated Venice Dream"
    assert updated["budget_amount"] == 3500.0

    # 6. Delete trip
    deleted = await trip_service.delete_trip(trip_id=trip_id, user_id=user_id)
    assert deleted is True

    # 7. Verify not found after deletion
    with pytest.raises(EntityNotFoundError):
        await trip_service.get_trip(trip_id=trip_id, user_id=user_id)


@pytest.mark.asyncio
async def test_itinerary_repository_versioning_and_refinement():
    """Tests current version management and refinement history persistence."""
    trip_id = "trip-test-refine-101"
    user_id = "user-refine-101"

    # 1. Create version 1
    v1_data = {
        "days": [{"day_number": 1, "title": "Day 1 Arrival", "activities": []}],
        "version": 1
    }
    saved_v1 = await itinerary_repository.create_itinerary_version(
        trip_id=trip_id,
        structured_itinerary=v1_data,
        version=1,
        provider="mock"
    )
    itin_id = saved_v1["id"]
    assert saved_v1["trip_id"] == trip_id

    # 2. Record refinement history entry
    refinement_record = await itinerary_repository.save_refinement_history(
        trip_id=trip_id,
        itinerary_id=itin_id,
        user_id=user_id,
        instruction="Add dinner near Piazza San Marco",
        summary="Added evening dining"
    )
    assert refinement_record["trip_id"] == trip_id
    assert refinement_record["instruction"] == "Add dinner near Piazza San Marco"

    # 3. Retrieve refinement history
    history = await itinerary_repository.get_refinement_history(trip_id=trip_id)
    assert len(history) >= 1
    assert any(h["instruction"] == "Add dinner near Piazza San Marco" for h in history)

    # 4. Set current itinerary
    is_set = await itinerary_repository.set_current_itinerary(trip_id=trip_id, itinerary_id=itin_id)
    assert is_set is True


def test_trips_api_endpoints_crud(client: TestClient):
    """Verify FastAPI CRUD endpoints with both /api/v1/trips and /api/trips paths."""
    trip_payload = {
        "title": "Swiss Alps Trek",
        "destination": "Zermatt, Switzerland",
        "start_date": "2026-07-01",
        "end_date": "2026-07-06",
        "traveler_count": 3,
        "budget_amount": 4500.0,
        "currency": "CHF",
        "travel_preferences": {
            "travel_vibe": "adventure",
            "travel_pace": "fast",
            "interests": ["hiking", "glaciers"]
        }
    }

    # 1. POST /api/v1/trips
    res_v1 = client.post("/api/v1/trips", json=trip_payload)
    assert res_v1.status_code == 201
    trip_v1 = res_v1.json()
    trip_id = trip_v1["id"]

    # 2. GET /api/v1/trips
    list_res = client.get("/api/v1/trips")
    assert list_res.status_code == 200
    assert any(t["id"] == trip_id for t in list_res.json())

    # 3. GET /api/v1/trips/{trip_id}
    get_res = client.get(f"/api/v1/trips/{trip_id}")
    assert get_res.status_code == 200
    assert get_res.json()["destination"] == "Zermatt, Switzerland"

    # 4. GET /api/trips (Legacy path alias)
    legacy_list_res = client.get("/api/trips")
    assert legacy_list_res.status_code == 200
    assert any(t["id"] == trip_id for t in legacy_list_res.json())

    # 5. PATCH /api/v1/trips/{trip_id}
    patch_res = client.patch(f"/api/v1/trips/{trip_id}", json={"budget_amount": 5000.0})
    assert patch_res.status_code == 200
    assert patch_res.json()["budget_amount"] == 5000.0

    # 6. DELETE /api/v1/trips/{trip_id}
    del_res = client.delete(f"/api/v1/trips/{trip_id}")
    assert del_res.status_code == 204

    # 7. Verify 404 after deletion
    get_del = client.get(f"/api/v1/trips/{trip_id}")
    assert get_del.status_code == 404
