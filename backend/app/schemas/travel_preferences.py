from typing import List, Optional
from pydantic import BaseModel, Field

class TravelPreferences(BaseModel):
    travel_vibe: str = Field(
        default="cultural",
        description="Vibe: adventure, relaxed, romantic, cultural, luxury, nature, family-friendly, budget-friendly"
    )
    travel_pace: str = Field(
        default="moderate",
        description="Pace: relaxed, moderate, fast"
    )
    travel_style: Optional[str] = Field(
        default="standard",
        description="Style: budget, standard, luxury, backpacker, family"
    )
    interests: List[str] = Field(
        default_factory=lambda: ["sightseeing", "food & dining", "culture & history"],
        description="User interests such as culinary, museums, nature, nightlife, photography"
    )
    preferred_transportation: List[str] = Field(
        default_factory=lambda: ["public_transit", "walking"],
        description="Modes: walking, public_transit, taxi/rideshare, rental_car, bicycle"
    )
    dietary_requirements: List[str] = Field(
        default_factory=list,
        description="Dietary: vegetarian, vegan, halal, kosher, gluten-free, nut_allergy, etc."
    )
    accessibility_requirements: List[str] = Field(
        default_factory=list,
        description="Mobility/accessibility: wheelchair, step_free, elevator_required, low_walking"
    )
    accommodation_preference: Optional[str] = Field(
        default="boutique_hotel",
        description="Type: hotel, boutique_hotel, resort, hostel, apartment"
    )
    notes: Optional[str] = Field(
        default="",
        description="Specific wishes, places to avoid, or special conditions"
    )
