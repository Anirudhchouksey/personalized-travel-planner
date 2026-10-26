"""
Automated unit tests for ItineraryService, prompt builder, conflict detection,
and Pydantic schema validation.
"""
from datetime import date, datetime
import pytest

from app.schemas.itinerary import (
    ItineraryActivity,
    ItineraryDay,
    ItineraryResponse,
)
from app.schemas.trip import TripCreate
from app.ai.prompt_builder import PromptBuilder
from app.ai.output_parser import ItineraryOutputParser
from app.services.itinerary_service import ItineraryService
from app.db.repository import repository

def test_itinerary_activity_schema_validation():
    """Verify ItineraryActivity conforms to required fields and defaults."""
    act = ItineraryActivity(
        id="act-1-1",
        name="Sagrada Familia Tour",
        category="sightseeing",
        time_slot="morning",
        start_time="09:00",
        end_time="11:30",
        duration_minutes=150,
        location="Barcelona, Spain",
        description="Gaudí architectural masterpiece.",
        estimated_cost=26.0,
        travel_notes="Metro Line 2 / 5 to Sagrada Família station.",
        accessibility_notes="Elevator access to towers; wheelchair ramp at main entrance."
    )
    assert act.name == "Sagrada Familia Tour"
    assert act.duration_minutes == 150
    assert act.estimated_cost == 26.0
    assert act.accessibility_notes is not None

def test_itinerary_response_schema_validation():
    """Verify ItineraryResponse aggregates costs and validates total_days."""
    day = ItineraryDay(
        day_number=1,
        date="2026-06-01",
        title="Day 1: Historic Center",
        summary="Arrival and historic landmarks.",
        activities=[
            ItineraryActivity(
                id="act-1-1",
                name="Museum Visit",
                category="culture",
                time_slot="morning",
                start_time="10:00",
                end_time="12:00",
                duration_minutes=120,
                estimated_cost=15.0
            ),
            ItineraryActivity(
                id="act-1-2",
                name="Traditional Bistro Lunch",
                category="dining",
                time_slot="afternoon",
                start_time="12:30",
                end_time="14:00",
                duration_minutes=90,
                estimated_cost=25.0
            )
        ]
    )

    resp = ItineraryResponse(
        id="itin-12345",
        trip_id="trip-12345",
        destination="Madrid, Spain",
        start_date="2026-06-01",
        end_date="2026-06-01",
        days=[day]
    )

    assert resp.total_days == 1
    assert resp.estimated_total_cost == 40.0

def test_conflict_detection_and_resolution():
    """Verify that overlapping activities are detected and resolved with buffers."""
    overlapping_activities = [
        {
            "id": "act-1",
            "name": "Morning Walking Tour",
            "start_time": "09:00",
            "end_time": "11:00",
            "duration_minutes": 120
        },
        {
            "id": "act-2",
            "name": "Cooking Class (Overlaps!)",
            "start_time": "10:30",
            "end_time": "12:30",
            "duration_minutes": 120
        }
    ]

    resolved = ItineraryService._resolve_schedule_conflicts(overlapping_activities)
    assert len(resolved) == 2
    # act-1 finishes at 11:00, act-2 must start at or after 11:15 (buffered by 15 mins)
    assert resolved[0]["end_time"] == "11:00"
    assert resolved[1]["start_time"] == "11:15"
    assert resolved[1]["end_time"] == "13:15"

def test_date_alignment_and_padding_missing_days():
    """Verify missing days are padded to match total requested duration."""
    start = date(2026, 7, 1)
    partial_days = [
        {
            "day_number": 1,
            "title": "Day 1 Highlights",
            "activities": []
        }
    ]

    aligned = ItineraryService._align_and_cover_dates(
        days=partial_days,
        start_date=start,
        total_days=3,
        destination="Kyoto"
    )

    assert len(aligned) == 3
    assert aligned[0]["date"] == "2026-07-01"
    assert aligned[1]["date"] == "2026-07-02"
    assert aligned[2]["date"] == "2026-07-03"
    assert len(aligned[1]["activities"]) > 0

def test_output_parser_bounded_repair():
    """Verify output parser repairs truncated JSON."""
    truncated = '{"days": [{"day_number": 1, "title": "Day 1", "activities": [{"name": "Market Visit"'
    parsed = ItineraryOutputParser.parse_raw(truncated)
    assert "days" in parsed
    assert len(parsed["days"]) >= 1

@pytest.mark.asyncio
async def test_itinerary_service_generate_and_persist():
    """Verify ItineraryService creates a valid itinerary and persists to database repository."""
    # Create a trip in test repository
    trip = await repository.create_trip(
        user_id="test-user-uuid-12345",
        data=TripCreate(
            title="Zurich Exploration",
            destination="Zurich, Switzerland",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 3)
        )
    )

    service = ItineraryService.get_service("mock")
    itin_response = await service.generate_for_trip(
        trip_id=trip["id"],
        user_id="test-user-uuid-12345"
    )

    assert itin_response.destination == "Zurich, Switzerland"
    assert itin_response.total_days == 3
    assert len(itin_response.days) == 3
    assert itin_response.estimated_total_cost > 0
