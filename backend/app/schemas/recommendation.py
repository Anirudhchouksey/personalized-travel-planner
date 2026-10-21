from typing import List, Optional
from pydantic import BaseModel, Field

class DestinationDiscoveryRequest(BaseModel):
    origin: Optional[str] = Field(default="", json_schema_extra={"example": "New York (JFK)"})
    travel_vibe: str = Field(default="cultural", json_schema_extra={"example": "cultural"})
    budget_amount: Optional[float] = Field(default=2500.0, json_schema_extra={"example": 2500.0})
    currency: str = Field(default="USD", json_schema_extra={"example": "USD"})
    duration_days: int = Field(default=7, ge=1, le=30, json_schema_extra={"example": 7})
    traveler_count: int = Field(default=2, ge=1, le=20, json_schema_extra={"example": 2})
    interests: List[str] = Field(
        default_factory=lambda: ["art", "food", "historic sites"],
        json_schema_extra={"example": ["art", "food", "historic sites"]}
    )
    climate_preference: Optional[str] = Field(default="temperate", json_schema_extra={"example": "mild/sunny"})
    mobility_notes: Optional[str] = Field(default="", json_schema_extra={"example": "Prefer flat walkable cities"})

class DestinationOption(BaseModel):
    destination: str
    country: str
    match_score: int = Field(ge=0, le=100)
    tagline: str
    highlights: List[str]
    estimated_cost_range: str
    best_season: str
    reasoning: str
    suggested_duration_days: int
    accessibility_rating: str

class DestinationRecommendationResponse(BaseModel):
    recommendations: List[DestinationOption]
    generated_at: str
    provider_used: str
