from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from app.services.ai.base import LLMProvider

class MockProvider(LLMProvider):
    """
    High-fidelity deterministic mock provider for testing, offline execution,
    and fallback demonstration without requiring live API credentials.
    """
    name: str = "mock"

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        expected_root_key: Optional[str] = None
    ) -> Dict[str, Any]:
        prompt_lower = prompt.lower()

        # 1. Single-day Regeneration request
        if "regenerate day" in prompt_lower:
            return self._generate_mock_day_regeneration(prompt)

        # 2. Activity Recommendations request
        if "categorized travel activities" in prompt_lower or "activity recommendations" in prompt_lower:
            return self._generate_mock_activities(prompt)

        # 3. Recommendations Refinement request
        if "refine travel recommendations" in prompt_lower:
            return self._generate_mock_refine(prompt)

        # 4. Destination Discovery / Recommendations request
        if "recommend 3-4 top destination options" in prompt_lower or "candidate destinations" in prompt_lower:
            return self._generate_mock_destinations(prompt_lower)

        # 5. Otherwise, generate a full multi-day itinerary
        return self._generate_mock_full_itinerary(prompt)

    def _generate_mock_activities(self, prompt: str) -> Dict[str, Any]:
        return {
            "attractions": [
                {
                    "name": "Historic Landmark & Grand Gardens",
                    "category": "attraction",
                    "description": "Iconic cultural monument and scenic botanical walking path.",
                    "estimated_cost": 18.0,
                    "currency": "USD",
                    "location_name": "Historic District",
                    "duration_minutes": 120,
                    "practical_tips": "Book morning tickets to avoid crowds.",
                    "verification_status": "verified"
                },
                {
                    "name": "Panoramic City Viewpoint & Plaza",
                    "category": "attraction",
                    "description": "Scenic vantage point overlooking the old city center.",
                    "estimated_cost": 0.0,
                    "currency": "USD",
                    "location_name": "Old Town Hill",
                    "duration_minutes": 60,
                    "practical_tips": "Best viewed during sunset golden hour.",
                    "verification_status": "verified"
                }
            ],
            "dining": [
                {
                    "name": "Local Heritage Bistro & Market Dining",
                    "category": "dining",
                    "description": "Authentic regional specialties made with fresh local ingredients.",
                    "estimated_cost": 28.0,
                    "currency": "USD",
                    "location_name": "Central Market",
                    "duration_minutes": 90,
                    "practical_tips": "Accommodates dietary preferences including vegetarian options.",
                    "verification_status": "estimated"
                },
                {
                    "name": "Artisanal Coffee & Pastry Roastery",
                    "category": "dining",
                    "description": "Cozy independent cafe specializing in single-origin pour-overs.",
                    "estimated_cost": 8.0,
                    "currency": "USD",
                    "location_name": "Arts Quarter",
                    "duration_minutes": 45,
                    "practical_tips": "Outdoor seating available with step-free entry.",
                    "verification_status": "estimated"
                }
            ],
            "adventure": [
                {
                    "name": "Guided Forest & Valley Nature Hike",
                    "category": "adventure",
                    "description": "Scenic trail through coastal cliffs or forested foothills.",
                    "estimated_cost": 35.0,
                    "currency": "USD",
                    "location_name": "National Park Trailhead",
                    "duration_minutes": 180,
                    "practical_tips": "Sturdy walking footwear recommended.",
                    "verification_status": "estimated"
                }
            ],
            "cultural_experiences": [
                {
                    "name": "Traditional Artisan Workshop & Tasting",
                    "category": "cultural",
                    "description": "Hands-on masterclass with local craftspeople and culinary artisans.",
                    "estimated_cost": 30.0,
                    "currency": "USD",
                    "location_name": "Guild Quarter",
                    "duration_minutes": 90,
                    "practical_tips": "Interactive session suitable for all group sizes.",
                    "verification_status": "verified"
                }
            ],
            "practical_tips": [
                "Purchase an all-day transit pass at main train stations to save on fares.",
                "Most cultural attractions offer discounted tickets when reserved online."
            ]
        }

    def _generate_mock_refine(self, prompt: str) -> Dict[str, Any]:
        return {
            "destination": "Refined Destination Choices",
            "refinement_summary": "Adjusted recommendations based on updated dietary and pacing feedback.",
            "recommendations": [
                {
                    "destination": "Kyoto (Step-Free & Plant-Based Focus)",
                    "country": "Japan",
                    "match_score": 98,
                    "tagline": "Tranquil zen gardens with accessible pathways and vibrant shojin ryori dining",
                    "highlights": ["Tenryu-ji Temple", "Pontocho Dining Alley", "Kamogawa Riverside Walk"],
                    "estimated_cost_range": "$1,900 - $2,700",
                    "best_season": "October - November",
                    "reasoning": "Directly incorporates your preference for step-free routes and specialized dining.",
                    "suggested_duration_days": 7,
                    "accessibility_rating": "Excellent"
                }
            ]
        }

    def _generate_mock_destinations(self, prompt_lower: str) -> Dict[str, Any]:
        return {
            "recommendations": [
                {
                    "destination": "Kyoto & Nara",
                    "country": "Japan",
                    "match_score": 96,
                    "tagline": "Ancient temples, bamboo groves, and tranquil tea ceremonies",
                    "highlights": ["Fushimi Inari Taisha", "Arashiyama Bamboo Forest", "Gion Historic District", "Nara Deer Park"],
                    "estimated_cost_range": "$1,800 - $2,800",
                    "best_season": "Autumn (October - November) / Spring (March - April)",
                    "reasoning": "Perfect alignment with cultural exploration, high walkability, extraordinary culinary scene, and tranquil ambiance.",
                    "suggested_duration_days": 7,
                    "accessibility_rating": "Good (accessible transit and shrines)"
                },
                {
                    "destination": "Florence & Tuscany",
                    "country": "Italy",
                    "match_score": 92,
                    "tagline": "Renaissance art, Tuscan hill towns, and world-class gastronomy",
                    "highlights": ["Uffizi Gallery", "Duomo di Firenze", "Chianti Wine Valley", "Ponte Vecchio"],
                    "estimated_cost_range": "$2,200 - $3,200",
                    "best_season": "May - June / September - October",
                    "reasoning": "Exceptional fit for travelers seeking art, historic architecture, and relaxed culinary pacing.",
                    "suggested_duration_days": 6,
                    "accessibility_rating": "Moderate (cobblestones in historic core)"
                },
                {
                    "destination": "Oaxaca City & Coast",
                    "country": "Mexico",
                    "match_score": 89,
                    "tagline": "Indigenous artisan crafts, rich culinary heritage, and vibrant colonial streets",
                    "highlights": ["Monte Albán Ruins", "Templo de Santo Domingo", "Mercado 20 de Noviembre", "Hierve el Agua"],
                    "estimated_cost_range": "$1,200 - $1,900",
                    "best_season": "November - March",
                    "reasoning": "Outstanding value for money, deep cultural immersion, and world-renowned food heritage.",
                    "suggested_duration_days": 5,
                    "accessibility_rating": "Fair (active walking involved)"
                }
            ],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "provider_used": "mock"
        }

    def _generate_mock_full_itinerary(self, prompt: str) -> Dict[str, Any]:
        # Extract basic hints from prompt
        destination = "Kyoto, Japan"
        if "destination:" in prompt.lower():
            try:
                part = prompt.split("Destination:")[1].split("\n")[0].strip()
                if part:
                    destination = part
            except Exception:
                pass

        return {
            "trip_title": f"Personalized Journey to {destination}",
            "destination": destination,
            "overall_summary": f"A balanced, culturally grounded travel plan tailored to your rhythm in {destination}. Each day groups geographically proximate venues to maximize enjoyment and minimize transit stress.",
            "total_estimated_cost": 1850.00,
            "currency": "USD",
            "practical_tips": [
                "Carry a light daypack with portable battery charger and refillable water bottle.",
                "Reserve popular dining spots 2-3 days in advance when possible.",
                "Keep cash/coins handy for local transit and boutique stalls."
            ],
            "days": [
                {
                    "day_number": 1,
                    "date": "2026-11-01",
                    "summary": "Arrival, Neighborhood Orientation & Scenic Evening Welcome",
                    "notes": "Ease into local rhythm after transit; gentle walking and atmospheric sunset views.",
                    "activities": [
                        {
                            "name": "Check-in & Historic District Orientation",
                            "description": "Settle into accommodation, freshen up, and take a relaxed stroll through the surrounding heritage alleyways.",
                            "category": "relaxation",
                            "start_time": "14:00",
                            "end_time": "15:30",
                            "location_name": f"{destination} Historic Center",
                            "latitude": 35.0116,
                            "longitude": 135.7681,
                            "estimated_cost": 0.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 90,
                            "verification_status": "estimated",
                            "display_order": 0
                        },
                        {
                            "name": "Local Artisan Tea House & Pastry Tasting",
                            "description": "Sample fresh local delicacies and specialty tea while learning about regional culinary traditions.",
                            "category": "meal",
                            "start_time": "16:00",
                            "end_time": "17:15",
                            "location_name": "Heritage Tea Pavilion",
                            "latitude": 35.0037,
                            "longitude": 135.7725,
                            "estimated_cost": 22.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 75,
                            "verification_status": "approximate",
                            "display_order": 1
                        },
                        {
                            "name": "Sunset Riverbank Promenade & Welcome Dinner",
                            "description": "Walk along the scenic waterway and savor an authentic seasonal tasting dinner.",
                            "category": "meal",
                            "start_time": "18:00",
                            "end_time": "20:30",
                            "location_name": "Riverside Dining Quarter",
                            "latitude": 35.0050,
                            "longitude": 135.7700,
                            "estimated_cost": 65.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 150,
                            "verification_status": "estimated",
                            "display_order": 2
                        }
                    ]
                },
                {
                    "day_number": 2,
                    "date": "2026-11-02",
                    "summary": "Iconic Landmarks, Ancient Architecture & Scenic Views",
                    "notes": "Start early to beat peak mid-day visitor volume; comfortable walking shoes recommended.",
                    "activities": [
                        {
                            "name": "Early Morning Torii Path / Sacred Shrine Visit",
                            "description": "Explore the vibrant crimson shrine paths in peaceful morning serenity before crowds gather.",
                            "category": "sightseeing",
                            "start_time": "08:30",
                            "end_time": "11:00",
                            "location_name": "South Foothill Sanctuary",
                            "latitude": 34.9671,
                            "longitude": 135.7727,
                            "estimated_cost": 0.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 150,
                            "verification_status": "verified",
                            "display_order": 0
                        },
                        {
                            "name": "Traditional Noodle & Broth Lunch",
                            "description": "Enjoy freshly hand-pulled noodles with savory seasonal broth at a celebrated local tavern.",
                            "category": "meal",
                            "start_time": "11:45",
                            "end_time": "13:00",
                            "location_name": "Craft Noodle House",
                            "latitude": 34.9750,
                            "longitude": 135.7650,
                            "estimated_cost": 18.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 75,
                            "verification_status": "approximate",
                            "display_order": 1
                        },
                        {
                            "name": "Zen Garden & Cedar Temple Discovery",
                            "description": "Marvel at dry landscape stone gardens and centuries-old wooden veranda architecture.",
                            "category": "culture",
                            "start_time": "14:00",
                            "end_time": "16:00",
                            "location_name": "Zen Temple Grounds",
                            "latitude": 35.0394,
                            "longitude": 135.7292,
                            "estimated_cost": 10.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 120,
                            "verification_status": "verified",
                            "display_order": 2
                        },
                        {
                            "name": "Lantern-Lit Lantern Lane Walk & Casual Tapas",
                            "description": "Stroll cobblestone alleys flanked by traditional wood façades, finding cozy small-plate eateries.",
                            "category": "sightseeing",
                            "start_time": "17:30",
                            "end_time": "20:00",
                            "location_name": "Preserved Lantern Alley",
                            "latitude": 35.0035,
                            "longitude": 135.7730,
                            "estimated_cost": 45.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 150,
                            "verification_status": "estimated",
                            "display_order": 3
                        }
                    ]
                },
                {
                    "day_number": 3,
                    "date": "2026-11-03",
                    "summary": "Nature Sanctuary, Riverside Groves & Artisan Crafting",
                    "notes": "Includes scenic river views and opportunities to browse handmade ceramics and textile shops.",
                    "activities": [
                        {
                            "name": "Towering Bamboo Grove & Moss Garden Walk",
                            "description": "Immerse in soaring emerald bamboo stalks swaying in the breeze, followed by quiet moss garden trails.",
                            "category": "nature",
                            "start_time": "09:00",
                            "end_time": "11:30",
                            "location_name": "West River Forest Reserve",
                            "latitude": 35.0169,
                            "longitude": 135.6713,
                            "estimated_cost": 5.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 150,
                            "verification_status": "verified",
                            "display_order": 0
                        },
                        {
                            "name": "Bento Picnic by the Historic Wooden Bridge",
                            "description": "Pick up artisanal local bento boxes and enjoy a relaxing meal overlooking the river.",
                            "category": "meal",
                            "start_time": "12:00",
                            "end_time": "13:15",
                            "location_name": "Moon Crossing Riverside Park",
                            "latitude": 35.0130,
                            "longitude": 135.6770,
                            "estimated_cost": 20.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 75,
                            "verification_status": "approximate",
                            "display_order": 1
                        },
                        {
                            "name": "Ceramics Workshop & Studio Visit",
                            "description": "Watch master potters craft regional earthenware and try your hand at shaping a keepsake cup.",
                            "category": "culture",
                            "start_time": "14:15",
                            "end_time": "16:30",
                            "location_name": "Artisan Clay Atelier",
                            "latitude": 35.0150,
                            "longitude": 135.6800,
                            "estimated_cost": 40.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 135,
                            "verification_status": "estimated",
                            "display_order": 2
                        },
                        {
                            "name": "Chef's Counter Seasonal Tasting Dinner",
                            "description": "Multi-course dinner highlighting regional root vegetables, grilled delicacies, and sake pairing.",
                            "category": "meal",
                            "start_time": "18:30",
                            "end_time": "21:00",
                            "location_name": "Kappo Gastronomy Table",
                            "latitude": 35.0080,
                            "longitude": 135.7650,
                            "estimated_cost": 85.00,
                            "currency": "USD",
                            "estimated_duration_minutes": 150,
                            "verification_status": "approximate",
                            "display_order": 3
                        }
                    ]
                }
            ]
        }

    def _generate_mock_day_regeneration(self, prompt: str) -> Dict[str, Any]:
        return {
            "summary": "Refined Day: Customized Pace & Handpicked Experiences",
            "notes": "Updated in response to user feedback, ensuring smooth geographic flow and ideal rest breaks.",
            "activities": [
                {
                    "name": "Morning Cultural Discovery & Garden Stroll",
                    "description": "Curated morning visit emphasizing open-air walkways, beautiful photography vantage points, and lower physical strain.",
                    "category": "culture",
                    "start_time": "09:30",
                    "end_time": "11:30",
                    "location_name": "Scenic Heritage Garden",
                    "latitude": 35.0120,
                    "longitude": 135.7600,
                    "estimated_cost": 8.00,
                    "currency": "USD",
                    "estimated_duration_minutes": 120,
                    "verification_status": "estimated",
                    "display_order": 0
                },
                {
                    "name": "Farm-to-Table Organic Bistro Lunch",
                    "description": "Fresh, dietary-friendly culinary experience catering directly to selected dietary preferences.",
                    "category": "meal",
                    "start_time": "12:00",
                    "end_time": "13:30",
                    "location_name": "Botanical Courtyard Café",
                    "latitude": 35.0100,
                    "longitude": 135.7620,
                    "estimated_cost": 24.00,
                    "currency": "USD",
                    "estimated_duration_minutes": 90,
                    "verification_status": "approximate",
                    "display_order": 1
                },
                {
                    "name": "Interactive Neighborhood Walking Tour & Local Tasting",
                    "description": "Engaging afternoon encounter exploring hidden courtyards, boutique spice merchants, and regional sweets.",
                    "category": "sightseeing",
                    "start_time": "14:30",
                    "end_time": "17:00",
                    "location_name": "Old Merchant Quarter",
                    "latitude": 35.0070,
                    "longitude": 135.7680,
                    "estimated_cost": 30.00,
                    "currency": "USD",
                    "estimated_duration_minutes": 150,
                    "verification_status": "estimated",
                    "display_order": 2
                },
                {
                    "name": "Atmospheric Candlelit Bistro Dinner",
                    "description": "Relaxing culinary wrap-up with comfortable seating, acoustic backdrop, and local wine or mocktail selections.",
                    "category": "meal",
                    "start_time": "18:30",
                    "end_time": "20:30",
                    "location_name": "Lantern Courtyard Dining",
                    "latitude": 35.0050,
                    "longitude": 135.7710,
                    "estimated_cost": 50.00,
                    "currency": "USD",
                    "estimated_duration_minutes": 120,
                    "verification_status": "approximate",
                    "display_order": 3
                }
            ]
        }

    async def check_health(self) -> Dict[str, Any]:
        return {
            "provider": self.name,
            "model": "deterministic-mock-v1",
            "configured": True,
            "status": "ready",
            "message": "Mock provider is ready for zero-cost testing and demonstrations"
        }
