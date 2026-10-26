"""
Pydantic schemas for the AI Itinerary Generation layer.
Strictly validates activities, time slots, days, and complete itinerary payloads.
"""
from datetime import date as dt_date, datetime as dt_datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, model_validator

class ItineraryActivity(BaseModel):
    """
    Structured representation of a single scheduled activity.
    Matches Master Prompt specification: id, name, category, time_slot,
    start_time, end_time, duration_minutes, location, description,
    estimated_cost, travel_notes, accessibility_notes.
    """
    id: str = Field(..., description="Unique activity identifier (e.g. act-1-1)")
    name: str = Field(..., min_length=1, max_length=250, description="Activity or venue name")
    category: str = Field(default="sightseeing", description="sightseeing, dining, adventure, culture, shopping, relaxation")
    time_slot: str = Field(default="morning", description="morning, afternoon, evening, night")
    start_time: Optional[str] = Field(default="09:00", description="HH:MM format")
    end_time: Optional[str] = Field(default="11:00", description="HH:MM format")
    duration_minutes: int = Field(default=90, ge=0, description="Activity duration in minutes")
    location: Optional[str] = Field(default="", description="Location name or address")
    description: Optional[str] = Field(default="", description="Detailed summary of activity")
    estimated_cost: Optional[float] = Field(default=0.0, ge=0, description="Estimated cost in USD")
    travel_notes: Optional[str] = Field(default="", description="Transit directions and practical guidance")
    accessibility_notes: Optional[str] = Field(default="", description="Wheelchair, ramp, or seating details")

    # Compatibility attributes for database and legacy consumers
    itinerary_day_id: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    currency: Optional[str] = "USD"
    estimated_duration_minutes: Optional[int] = None
    verification_status: Optional[str] = "estimated"
    display_order: Optional[int] = 0
    created_at: Optional[dt_datetime] = None
    updated_at: Optional[dt_datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def sync_compat_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "location_name" in data and not data.get("location"):
                data["location"] = data["location_name"]
            elif "location" in data and not data.get("location_name"):
                data["location_name"] = data["location"]

            if "estimated_duration_minutes" in data and not data.get("duration_minutes"):
                data["duration_minutes"] = data["estimated_duration_minutes"]
            elif "duration_minutes" in data and not data.get("estimated_duration_minutes"):
                data["estimated_duration_minutes"] = data["duration_minutes"]
        return data

# Aliases for backward compatibility
ActivityBase = ItineraryActivity
ActivityResponse = ItineraryActivity

class ActivityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=250)
    category: str = Field(default="sightseeing")
    time_slot: str = Field(default="morning")
    start_time: Optional[str] = "09:00"
    end_time: Optional[str] = "11:00"
    duration_minutes: int = 90
    location: Optional[str] = ""
    description: Optional[str] = ""
    estimated_cost: Optional[float] = 0.0
    travel_notes: Optional[str] = ""
    accessibility_notes: Optional[str] = ""

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    time_slot: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimated_cost: Optional[float] = None
    currency: Optional[str] = None
    travel_notes: Optional[str] = None
    accessibility_notes: Optional[str] = None
    verification_status: Optional[str] = None
    display_order: Optional[int] = None

class ItineraryDay(BaseModel):
    """
    Structured day schedule containing ordered morning, afternoon, and evening activities.
    """
    day_number: int = Field(..., ge=1, description="Sequential day number (1-based)")
    date: Union[dt_date, str] = Field(..., description="Date of the scheduled day (YYYY-MM-DD or date object)")
    title: Optional[str] = Field(default="", description="Descriptive headline for the day")
    summary: Optional[str] = Field(default="", description="Daily narrative or highlights")
    activities: List[ItineraryActivity] = Field(default_factory=list, description="Ordered activities")

    # Compatibility attributes
    id: Optional[str] = None
    itinerary_id: Optional[str] = None
    notes: Optional[str] = ""
    created_at: Optional[dt_datetime] = None
    updated_at: Optional[dt_datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Aliases for backward compatibility
ItineraryDayBase = ItineraryDay
ItineraryDayResponse = ItineraryDay

class ItineraryResponse(BaseModel):
    """
    Master Itinerary response schema.
    Includes destination, dates, total days, day schedules, and cost totals.
    """
    id: str = Field(..., description="Unique itinerary ID")
    trip_id: str = Field(..., description="Associated trip ID")
    destination: Optional[str] = Field(default="", description="Trip destination name")
    start_date: Optional[Union[dt_date, str]] = Field(default=None, description="Start date of trip")
    end_date: Optional[Union[dt_date, str]] = Field(default=None, description="End date of trip")
    total_days: Optional[int] = Field(default=None, ge=1, description="Total days in itinerary")
    days: List[ItineraryDay] = Field(default_factory=list, description="Day-by-day schedules")
    estimated_total_cost: Optional[float] = Field(default=0.0, ge=0, description="Aggregate estimated expenses")
    created_at: Optional[dt_datetime] = None
    updated_at: Optional[dt_datetime] = None

    # Compatibility attributes
    version: Optional[int] = 1
    structured_itinerary: Optional[Dict[str, Any]] = Field(default_factory=dict)
    generation_provider: Optional[str] = "gemini"

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def populate_summary_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Compute total_days from days list if missing
            days = data.get("days") or []
            if not data.get("total_days") and days:
                data["total_days"] = len(days)

            # Sum costs if missing
            if data.get("estimated_total_cost") is None:
                calc_cost = 0.0
                for day in days:
                    acts = day.get("activities", []) if isinstance(day, dict) else getattr(day, "activities", [])
                    for act in acts:
                        cost = act.get("estimated_cost", 0.0) if isinstance(act, dict) else getattr(act, "estimated_cost", 0.0)
                        if cost:
                            calc_cost += float(cost)
                data["estimated_total_cost"] = round(calc_cost, 2)
        return data

class DayRegenerateRequest(BaseModel):
    feedback: str = Field(
        ...,
        min_length=3,
        description="What changes or style you want for this specific day"
    )
    preserve_activity_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="IDs of activities that should remain fixed"
    )

class ItineraryRegenerateRequest(BaseModel):
    custom_instructions: Optional[str] = Field(
        default=None,
        description="Updated preferences or guidance for regenerating the schedule"
    )
    feedback: Optional[str] = Field(
        default=None,
        description="General feedback on why the itinerary is being regenerated"
    )
    preserve_days: Optional[List[int]] = Field(
        default_factory=list,
        description="Day numbers (e.g. [1, 3]) that should remain unchanged"
    )

class ItineraryGenerateRequest(BaseModel):
    trip_id: Optional[str] = None
    provider_override: Optional[str] = None
    custom_instructions: Optional[str] = None

class RefinementRequest(BaseModel):
    message: str = Field(..., min_length=2, description="User conversational modification instruction")
    target_day: Optional[int] = Field(default=None, description="Optional target day number (e.g. 2)")
    preserve_activity_ids: Optional[List[str]] = Field(default_factory=list, description="IDs of activities to lock/keep")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Recent conversation messages")

class RefinementResponse(BaseModel):
    itinerary: ItineraryResponse
    assistant_message: str
    version: int
    summary_of_changes: List[str] = Field(default_factory=list)

class ItineraryVersionItem(BaseModel):
    version: int
    user_instruction: Optional[str] = None
    summary: Optional[str] = None
    created_at: dt_datetime
    total_days: int
    estimated_total_cost: float

class ItineraryVersionListResponse(BaseModel):
    trip_id: str
    current_version: int
    versions: List[ItineraryVersionItem]
