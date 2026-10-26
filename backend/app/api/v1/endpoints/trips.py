"""
Trip Management Endpoints.
Supports both /api/v1/trips and /api/trips aliases.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthenticatedUser, get_current_user
from app.core.exceptions import EntityNotFoundError, AuthorizationError, ValidationError, AppException
from app.schemas.trip import TripCreate, TripResponse, TripUpdate
from app.schemas.itinerary import ItineraryGenerateRequest, ItineraryResponse
from app.schemas.collaborator import CollaboratorInvite, CollaboratorUpdate, CollaboratorResponse
from app.services.trip_service import trip_service
from app.services.itinerary_service import ItineraryService

router = APIRouter(prefix="/api/v1/trips", tags=["Trips"])
legacy_router = APIRouter(prefix="/api/trips", tags=["Trips Legacy"], include_in_schema=False)


def dual_route(method: str, path: str, **kwargs):
    """Binds endpoint handler to both v1 and legacy path routers."""
    def decorator(func):
        getattr(router, method)(path, **kwargs)(func)
        getattr(legacy_router, method)(path, **kwargs)(func)
        return func
    return decorator


@dual_route("post", "", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    data: TripCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates a new trip belonging to the authenticated user."""
    try:
        return await trip_service.create_trip(user_id=current_user.id, data=data)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.message)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@dual_route("get", "", response_model=List[TripResponse])
async def list_trips(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Returns all trips owned by the authenticated user."""
    return await trip_service.list_trips(user_id=current_user.id)


@dual_route("get", "/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves a single trip if owned by user."""
    try:
        return await trip_service.get_trip(trip_id=trip_id, user_id=current_user.id)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)


@dual_route("put", "/{trip_id}", response_model=TripResponse)
@dual_route("patch", "/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    data: TripUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Updates mutable trip fields."""
    try:
        return await trip_service.update_trip(trip_id=trip_id, user_id=current_user.id, data=data)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.message)


@dual_route("delete", "/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Deletes a trip and cascades associated itineraries."""
    try:
        await trip_service.delete_trip(trip_id=trip_id, user_id=current_user.id)
        return None
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)


@dual_route("post", "/{trip_id}/generate", response_model=ItineraryResponse)
async def generate_itinerary_for_trip(
    trip_id: str,
    payload: Optional[ItineraryGenerateRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Triggers AI generation for the trip using configured or requested provider."""
    provider_override = payload.provider_override if payload else None
    service = ItineraryService.get_service(provider_override)
    try:
        return await service.generate_for_trip(
            trip_id=trip_id,
            user_id=current_user.id,
            provider_override=provider_override
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@dual_route("get", "/{trip_id}/itineraries", response_model=List[ItineraryResponse])
async def get_trip_itineraries(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Lists all generated itinerary versions for the trip."""
    try:
        return await trip_service.get_trip_itineraries(trip_id=trip_id, user_id=current_user.id)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)


# ------------------------------------------------------------------------------
# COLLABORATOR ENDPOINTS
# ------------------------------------------------------------------------------
@dual_route("post", "/{trip_id}/collaborators", response_model=CollaboratorResponse, status_code=status.HTTP_201_CREATED)
async def add_collaborator(
    trip_id: str,
    payload: CollaboratorInvite,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Invites/adds a collaborator to the trip with viewer or editor permissions."""
    try:
        return await trip_service.add_collaborator(
            trip_id=trip_id,
            user_id=current_user.id,
            email=payload.email,
            role=payload.role
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)


@dual_route("get", "/{trip_id}/collaborators", response_model=List[CollaboratorResponse])
async def list_collaborators(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Lists all collaborators on a trip."""
    try:
        return await trip_service.list_collaborators(trip_id=trip_id, user_id=current_user.id)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)


@dual_route("patch", "/{trip_id}/collaborators/{collaborator_id}", response_model=CollaboratorResponse)
async def update_collaborator_role(
    trip_id: str,
    collaborator_id: str,
    payload: CollaboratorUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Updates a collaborator's role permissions (viewer vs editor)."""
    try:
        return await trip_service.update_collaborator_role(
            trip_id=trip_id,
            collaborator_id=collaborator_id,
            user_id=current_user.id,
            role=payload.role
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)


@dual_route("delete", "/{trip_id}/collaborators/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    trip_id: str,
    collaborator_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Removes a collaborator from the trip."""
    try:
        await trip_service.remove_collaborator(
            trip_id=trip_id,
            collaborator_id=collaborator_id,
            user_id=current_user.id
        )
        return None
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)
