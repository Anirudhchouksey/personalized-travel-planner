from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import AuthenticatedUser, get_current_user
from app.db.repository import repository
from app.schemas.trip import TripCreate, TripResponse, TripUpdate
from app.schemas.itinerary import ItineraryGenerateRequest, ItineraryResponse
from app.services.itinerary.generator import ItineraryService

router = APIRouter(prefix="/api/v1/trips", tags=["Trips"])

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    data: TripCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates a new trip belonging to the authenticated user."""
    trip = await repository.create_trip(user_id=current_user.id, data=data)
    return trip

@router.get("", response_model=List[TripResponse])
async def list_trips(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Returns all trips owned by the authenticated user."""
    trips = await repository.get_trips(user_id=current_user.id)
    return trips

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves a single trip if owned by user."""
    trip = await repository.get_trip_by_id(trip_id, user_id=current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found or access denied."
        )
    return trip

@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    data: TripUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Updates mutable trip fields."""
    updated = await repository.update_trip(trip_id=trip_id, user_id=current_user.id, data=data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found or access denied."
        )
    return updated

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Deletes a trip and cascades associated itineraries."""
    success = await repository.delete_trip(trip_id=trip_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found or access denied."
        )
    return None

@router.post("/{trip_id}/generate", response_model=ItineraryResponse)
async def generate_itinerary(
    trip_id: str,
    payload: Optional[ItineraryGenerateRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Triggers AI generation for the trip using configured or requested provider."""
    provider_override = payload.provider_override if payload else None
    result = await ItineraryService.generate_for_trip(
        trip_id=trip_id,
        user_id=current_user.id,
        provider_override=provider_override
    )
    return result

@router.get("/{trip_id}/itineraries", response_model=List[ItineraryResponse])
async def get_trip_itineraries(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Lists all generated itinerary versions for the trip."""
    # Verify trip ownership
    trip = await repository.get_trip_by_id(trip_id, user_id=current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")

    return await repository.get_itineraries_by_trip(trip_id)
