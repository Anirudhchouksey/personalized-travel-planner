"""
Deterministic, zero-cost Mock LLM Provider for local development, fallback, and automated tests.
"""
from datetime import datetime, timedelta
import json
import re
from typing import Any, Dict, List, Optional
from app.ai.providers.base import LLMProvider, LLMResponse

class MockProvider(LLMProvider):
    """
    Mock LLM provider that simulates Gemini Flash output without making any network calls.
    Used for local testing, offline development, and fallback when no API key is provided.
    """

    name: str = "mock"

    def __init__(self, model: str = "mock-gemini-flash"):
        self.model = model

    async def generate_text(
        self,
        prompt: str,
        settings: Optional[Dict[str, Any]] = None
    ) -> LLMResponse:
        return LLMResponse(
            text="Mock AI response: Travel itinerary successfully generated for your destination.",
            model=self.model,
            provider=self.name,
            usage={"prompt_tokens": 100, "completion_tokens": 250}
        )

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        expected_root_key: Optional[str] = None,
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Parses parameters from the prompt and constructs a realistic day-by-day itinerary.
        """
        # Extract destination if present
        dest_match = re.search(r"Destination:\s*([^\n,]+)", prompt, re.IGNORECASE)
        destination = dest_match.group(1).strip() if dest_match else "Kyoto, Japan"

        # Extract days/dates if present
        days_match = re.search(r"(\d+)\s*days?", prompt, re.IGNORECASE)
        num_days = int(days_match.group(1)) if days_match else 3
        num_days = max(1, min(num_days, 14))

        # Check for conversational refinement prompt
        if "modification instruction" in prompt.lower() or "refining an existing" in prompt.lower():
            full_itin = self._mock_itinerary(destination, num_days)
            return {
                "assistant_message": f"I have adjusted your {destination} itinerary based on your request. Activities have been calibrated to your preferred vibe and pace.",
                "summary_of_changes": [
                    "Adjusted schedule and pacing according to your instruction",
                    "Maintained meal intervals and verified landmark access"
                ],
                "days": full_itin["days"],
                "estimated_total_cost": full_itin["estimated_total_cost"]
            }

        # Check for day regeneration prompt
        if "regenerate day" in prompt.lower() or "single day" in prompt.lower():
            day_match = re.search(r"day\s*(\d+)", prompt, re.IGNORECASE)
            day_num = int(day_match.group(1)) if day_match else 1
            full_itin = self._mock_itinerary(destination, 1)
            first_day = full_itin["days"][0]
            first_day["day_number"] = day_num
            return first_day

        # Check for activity recommendation prompt vs itinerary prompt
        if "categories" in prompt.lower() or "tourist attractions" in prompt.lower():
            return self._mock_activities(destination)

        return self._mock_itinerary(destination, num_days)

    async def check_health(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "provider": self.name,
            "model": self.model,
            "available": True,
            "mode": "offline-mock"
        }

    def _mock_itinerary(self, destination: str, num_days: int) -> Dict[str, Any]:
        days = []
        base_date = datetime.now() + timedelta(days=7)

        for d in range(1, num_days + 1):
            day_date = (base_date + timedelta(days=d - 1)).strftime("%Y-%m-%d")
            activities = [
                {
                    "id": f"act-{d}-1",
                    "name": f"Morning Sightseeing at {destination} Historic Quarter",
                    "category": "sightseeing",
                    "time_slot": "morning",
                    "start_time": "09:00",
                    "end_time": "11:30",
                    "duration_minutes": 150,
                    "location": f"Central Landmark, {destination}",
                    "description": f"Explore iconic heritage architecture and scenic morning viewpoints in {destination}.",
                    "estimated_cost": 15.0,
                    "travel_notes": "10-minute walk from transit hub. Comfortable walking shoes recommended.",
                    "accessibility_notes": "Wheelchair accessible paved paths with ramp access."
                },
                {
                    "id": f"act-{d}-2",
                    "name": f"Artisanal Lunch & Culinary Tasting",
                    "category": "dining",
                    "time_slot": "afternoon",
                    "start_time": "12:00",
                    "end_time": "13:30",
                    "duration_minutes": 90,
                    "location": f"Market District, {destination}",
                    "description": "Savor authentic regional delicacies prepared with local farm-fresh ingredients.",
                    "estimated_cost": 25.0,
                    "travel_notes": "Directly adjacent to the historic quarter.",
                    "accessibility_notes": "Step-free street entrance, wide aisles."
                },
                {
                    "id": f"act-{d}-3",
                    "name": f"Cultural Discovery & Artisan Workshops",
                    "category": "culture",
                    "time_slot": "afternoon",
                    "start_time": "14:30",
                    "end_time": "17:00",
                    "duration_minutes": 150,
                    "location": f"Arts District, {destination}",
                    "description": "Engage with master craftsmen and explore interactive cultural exhibits.",
                    "estimated_cost": 20.0,
                    "travel_notes": "Short electric tram ride from dining area.",
                    "accessibility_notes": "Elevators available on all museum gallery floors."
                },
                {
                    "id": f"act-{d}-4",
                    "name": f"Evening Sunset Walk & Dinner",
                    "category": "dining",
                    "time_slot": "evening",
                    "start_time": "18:30",
                    "end_time": "21:00",
                    "duration_minutes": 150,
                    "location": f"Riverfront Promenade, {destination}",
                    "description": "Unwind with panoramic golden-hour views followed by a relaxed dining experience.",
                    "estimated_cost": 40.0,
                    "travel_notes": "Well-lit pedestrian promenade with riverside benches.",
                    "accessibility_notes": "Flat boardwalk access throughout."
                }
            ]

            days.append({
                "day_number": d,
                "date": day_date,
                "title": f"Day {d}: Highlights & Local Culture of {destination}",
                "summary": f"A balanced day combining historic landmarks, gourmet dining, and cultural immersion in {destination}.",
                "activities": activities
            })

        return {
            "days": days,
            "estimated_total_cost": sum(
                act.get("estimated_cost", 0) for day in days for act in day.get("activities", [])
            )
        }

    def _mock_activities(self, destination: str) -> Dict[str, Any]:
        return {
            "destination": destination,
            "attractions": [
                {
                    "name": f"Grand Cultural Sanctuary of {destination}",
                    "category": "sightseeing",
                    "description": "Premier historic attraction known for preserved architecture.",
                    "estimated_cost": 15.0,
                    "location": f"Central {destination}"
                }
            ],
            "dining": [
                {
                    "name": f"Traditional Hearth Kitchen {destination}",
                    "category": "dining",
                    "description": "Authentic regional culinary dining experience.",
                    "estimated_cost": 30.0,
                    "location": f"Old Town {destination}"
                }
            ],
            "adventure": [
                {
                    "name": f"Panoramic Ridge Trail & Valley Trek",
                    "category": "adventure",
                    "description": "Scenic guided trek with sweeping panoramic vistas.",
                    "estimated_cost": 25.0,
                    "location": f"Foothills of {destination}"
                }
            ],
            "cultural": [
                {
                    "name": f"Folk Craft Heritage Center",
                    "category": "culture",
                    "description": "Interactive craft workshops led by resident artisans.",
                    "estimated_cost": 18.0,
                    "location": f"Artisans Quarter {destination}"
                }
            ],
            "practical_tips": [
                "Purchase an all-day transit pass at central terminal to save costs.",
                "Comfortable walking shoes are recommended for cobblestone sections.",
                "Advance reservations are advised during peak sunset hours."
            ]
        }
