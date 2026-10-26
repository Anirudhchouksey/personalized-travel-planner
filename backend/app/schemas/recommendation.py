from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class DestinationDiscoveryRequest(BaseModel):
    origin: Optional[str] = Field(default="", json_schema_extra={"example": "New York (JFK)"})
    travel_vibe: str = Field(default="cultural", json_schema_extra={"example": "cultural"})
    travel_style: Optional[str] = Field(default="standard", json_schema_extra={"example": "standard"})
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

# Alias for Master Prompt requirement
DestinationRecommendationRequest = DestinationDiscoveryRequest

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

class ActivityItem(BaseModel):
    name: str
    category: str = Field(..., description="attraction | dining | adventure | cultural | experience")
    description: str
    estimated_cost: float = 0.0
    currency: str = "USD"
    location_name: Optional[str] = None
    duration_minutes: int = 90
    practical_tips: Optional[str] = None
    verification_status: str = "estimated"

class ActivityRecommendationRequest(BaseModel):
    destination: str = Field(..., min_length=2, json_schema_extra={"example": "Kyoto, Japan"})
    budget_level: Optional[str] = Field(default="moderate", json_schema_extra={"example": "moderate"})
    interests: List[str] = Field(default_factory=lambda: ["sightseeing", "food"])
    travel_pace: str = Field(default="moderate", json_schema_extra={"example": "moderate"})
    travel_style: Optional[str] = Field(default="standard", json_schema_extra={"example": "standard"})
    dietary_requirements: List[str] = Field(default_factory=list)
    accessibility_requirements: List[str] = Field(default_factory=list)
    currency: str = Field(default="USD")

class ActivityRecommendationResponse(BaseModel):
    destination: str
    attractions: List[ActivityItem]
    dining: List[ActivityItem]
    adventure: List[ActivityItem]
    cultural_experiences: List[ActivityItem]
    practical_tips: List[str]
    generated_at: str
    provider_used: str

class RecommendationRefineRequest(BaseModel):
    destination: str = Field(..., min_length=2)
    feedback: str = Field(..., min_length=3, json_schema_extra={"example": "Prioritize vegan ramen and step-free gardens"})
    current_recommendations: Optional[Dict[str, Any]] = None
    updated_interests: Optional[List[str]] = None
    dietary_requirements: Optional[List[str]] = None
    accessibility_requirements: Optional[List[str]] = None
    travel_pace: Optional[str] = None
