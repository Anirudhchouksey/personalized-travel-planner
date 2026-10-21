from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class ActivityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default="")
    category: str = Field(default="sightseeing")
    start_time: Optional[str] = Field(default="09:00", description="HH:MM format")
    end_time: Optional[str] = Field(default="11:00", description="HH:MM format")
    location_name: Optional[str] = Field(default="")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimated_cost: float = Field(default=0.0, ge=0)
    currency: str = Field(default="USD")
    estimated_duration_minutes: int = Field(default=90, ge=5)
    verification_status: str = Field(
        default="estimated",
        description="estimated | verified | approximate | unknown"
    )
    display_order: int = Field(default=0)

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimated_cost: Optional[float] = None
    currency: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    verification_status: Optional[str] = None
    display_order: Optional[int] = None

class ActivityResponse(ActivityBase):
    id: str
    itinerary_day_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ItineraryDayBase(BaseModel):
    day_number: int
    date: date
    summary: Optional[str] = ""
    notes: Optional[str] = ""

class ItineraryDayResponse(ItineraryDayBase):
    id: str
    itinerary_id: str
    activities: List[ActivityResponse] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ItineraryResponse(BaseModel):
    id: str
    trip_id: str
    version: int
    structured_itinerary: Dict[str, Any] = Field(default_factory=dict)
    generation_provider: str = "groq"
    days: List[ItineraryDayResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

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

class ItineraryGenerateRequest(BaseModel):
    provider_override: Optional[str] = None
    custom_instructions: Optional[str] = None
