from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.travel_preferences import TravelPreferences

class TripBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150, json_schema_extra={"example": "Week in Kyoto & Tokyo"})
    origin: Optional[str] = Field(None, max_length=100, json_schema_extra={"example": "San Francisco (SFO)"})
    destination: str = Field(..., min_length=2, max_length=150, json_schema_extra={"example": "Kyoto, Japan"})
    start_date: date = Field(..., json_schema_extra={"example": "2026-11-01"})
    end_date: date = Field(..., json_schema_extra={"example": "2026-11-07"})
    traveler_count: int = Field(default=1, ge=1, le=50, json_schema_extra={"example": 2})
    budget_amount: Optional[float] = Field(None, ge=0, json_schema_extra={"example": 3500.00})
    currency: str = Field(default="USD", max_length=5, json_schema_extra={"example": "USD"})
    travel_preferences: TravelPreferences = Field(default_factory=TravelPreferences)
    status: str = Field(default="planned", json_schema_extra={"example": "planned"})

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    origin: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    traveler_count: Optional[int] = Field(None, ge=1, le=50)
    budget_amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    travel_preferences: Optional[TravelPreferences] = None
    status: Optional[str] = None

class TripResponse(TripBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
