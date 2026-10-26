from app.schemas.travel_preferences import TravelPreferences
from app.schemas.trip import TripBase, TripCreate, TripUpdate, TripResponse, TripCreateRequest, TripUpdateRequest
from app.schemas.itinerary import (
    ActivityBase, ActivityCreate, ActivityUpdate, ActivityResponse,
    ItineraryActivity, ItineraryDay,
    ItineraryDayBase, ItineraryDayResponse, ItineraryResponse,
    DayRegenerateRequest, ItineraryRegenerateRequest, ItineraryGenerateRequest,
    RefinementRequest, RefinementResponse, ItineraryVersionItem, ItineraryVersionListResponse
)
from app.schemas.recommendation import (
    DestinationDiscoveryRequest, DestinationOption, DestinationRecommendationResponse,
    DestinationRecommendationRequest, ActivityItem, ActivityRecommendationRequest,
    ActivityRecommendationResponse, RecommendationRefineRequest
)
from app.schemas.share import ShareCreate, ShareResponse, PublicShareView
from app.schemas.collaborator import CollaboratorInvite, CollaboratorUpdate, CollaboratorResponse, CollaboratorRole
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenResponse, UserProfileResponse
from app.schemas.history import HistoryItemResponse, HistoryResponse
from app.schemas.common import ErrorResponse
from app.schemas.route import (
    RouteStopInput, RouteOptimizeRequest, RouteLeg, ScheduledStop,
    RouteComparisonMetric, RouteScheduleResponse, RouteCompareRequest
)

__all__ = [
    "TravelPreferences",
    "TripBase", "TripCreate", "TripUpdate", "TripResponse", "TripCreateRequest", "TripUpdateRequest",
    "ActivityBase", "ActivityCreate", "ActivityUpdate", "ActivityResponse",
    "ItineraryActivity", "ItineraryDay",
    "ItineraryDayBase", "ItineraryDayResponse", "ItineraryResponse",
    "DayRegenerateRequest", "ItineraryRegenerateRequest", "ItineraryGenerateRequest",
    "RefinementRequest", "RefinementResponse", "ItineraryVersionItem", "ItineraryVersionListResponse",
    "DestinationDiscoveryRequest", "DestinationOption", "DestinationRecommendationResponse",
    "DestinationRecommendationRequest", "ActivityItem", "ActivityRecommendationRequest",
    "ActivityRecommendationResponse", "RecommendationRefineRequest",
    "ShareCreate", "ShareResponse", "PublicShareView",
    "UserRegisterRequest", "UserLoginRequest", "TokenResponse", "UserProfileResponse",
    "HistoryItemResponse", "HistoryResponse", "ErrorResponse",
    "RouteStopInput", "RouteOptimizeRequest", "RouteLeg", "ScheduledStop",
    "RouteComparisonMetric", "RouteScheduleResponse", "RouteCompareRequest"
]
