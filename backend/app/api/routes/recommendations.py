from fastapi import APIRouter, Depends
from app.core.security import AuthenticatedUser, get_optional_user
from app.schemas.recommendation import DestinationDiscoveryRequest, DestinationRecommendationResponse
from app.services.recommendations.engine import recommendation_engine

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])

@router.post("/destinations", response_model=DestinationRecommendationResponse)
async def discover_destinations(
    data: DestinationDiscoveryRequest,
    current_user: AuthenticatedUser = Depends(get_optional_user)
):
    """Recommends curated candidate destinations based on budget, vibe, and duration constraints."""
    return await recommendation_engine.discover_destinations(data)
