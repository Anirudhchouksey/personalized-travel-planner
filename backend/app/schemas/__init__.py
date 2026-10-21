from app.schemas.travel_preferences import TravelPreferences
from app.schemas.trip import TripBase, TripCreate, TripUpdate, TripResponse
from app.schemas.itinerary import (
    ActivityBase, ActivityCreate, ActivityUpdate, ActivityResponse,
    ItineraryDayBase, ItineraryDayResponse, ItineraryResponse,
    DayRegenerateRequest, ItineraryGenerateRequest
)
from app.schemas.recommendation import (
    DestinationDiscoveryRequest, DestinationOption, DestinationRecommendationResponse
)
from app.schemas.share import ShareCreate, ShareResponse, PublicShareView

__all__ = [
    "TravelPreferences",
    "TripBase", "TripCreate", "TripUpdate", "TripResponse",
    "ActivityBase", "ActivityCreate", "ActivityUpdate", "ActivityResponse",
    "ItineraryDayBase", "ItineraryDayResponse", "ItineraryResponse",
    "DayRegenerateRequest", "ItineraryGenerateRequest",
    "DestinationDiscoveryRequest", "DestinationOption", "DestinationRecommendationResponse",
    "ShareCreate", "ShareResponse", "PublicShareView"
]
