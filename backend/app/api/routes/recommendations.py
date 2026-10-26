from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.core.security import AuthenticatedUser, get_optional_user
from app.schemas.recommendation import (
    DestinationDiscoveryRequest,
    DestinationRecommendationResponse,
    ActivityRecommendationRequest,
    ActivityRecommendationResponse,
    RecommendationRefineRequest
)
from app.services.recommendations.engine import recommendation_engine

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])

@router.post("/destinations", response_model=DestinationRecommendationResponse)
async def discover_destinations(
    data: DestinationDiscoveryRequest,
    current_user: AuthenticatedUser = Depends(get_optional_user)
):
    """Generates personalized destination suggestions based on travel preferences."""
    return await recommendation_engine.discover_destinations(data)

@router.post("/activities", response_model=ActivityRecommendationResponse)
async def recommend_activities(
    data: ActivityRecommendationRequest,
    current_user: AuthenticatedUser = Depends(get_optional_user)
):
    """Recommends categorized tourist attractions, dining, adventure, and cultural experiences."""
    return await recommendation_engine.recommend_activities(data)

@router.post("/refine")
async def refine_recommendations(
    data: RecommendationRefineRequest,
    current_user: AuthenticatedUser = Depends(get_optional_user)
):
    """Refines existing recommendations according to updated preferences or user feedback."""
    return await recommendation_engine.refine_recommendations(data)
