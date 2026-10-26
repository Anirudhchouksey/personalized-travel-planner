"""
FastAPI Router for AI Itinerary Generation, Retrieval, Updates, and Day Schedules.
"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.security import AuthenticatedUser, get_current_user
from app.core.exceptions import EntityNotFoundError, AuthorizationError, AppException
from app.db.repository import repository
from app.repositories.itinerary_repository import itinerary_repository
from app.schemas.itinerary import (
    ActivityResponse,
    ActivityUpdate,
    DayRegenerateRequest,
    ItineraryActivity,
    ItineraryDay,
    ItineraryDayResponse,
    ItineraryGenerateRequest,
    ItineraryRegenerateRequest,
    ItineraryResponse,
    RefinementRequest,
    RefinementResponse,
    ItineraryVersionItem,
    ItineraryVersionListResponse,
)
from app.services.itinerary_service import ItineraryService
from app.services.export.pdf_generator import pdf_exporter
from app.services.export.format_exporter import format_exporter

router = APIRouter(prefix="/api/v1/itineraries", tags=["Itineraries"])

@router.post("/generate", response_model=ItineraryResponse, status_code=status.HTTP_201_CREATED)
async def generate_itinerary(
    payload: ItineraryGenerateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Generate a personalized day-by-day itinerary from user preferences using Gemini Flash / configured LLM.
    """
    if not payload.trip_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'trip_id' is required to generate an itinerary."
        )

    service = ItineraryService.get_service(payload.provider_override)
    try:
        return await service.generate_for_trip(
            trip_id=payload.trip_id,
            user_id=current_user.id,
            provider_override=payload.provider_override,
            custom_instructions=payload.custom_instructions
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Generation failed: {str(e)}")

@router.post("/{trip_id}/regenerate", response_model=ItineraryResponse)
async def regenerate_itinerary(
    trip_id: str,
    payload: Optional[ItineraryRegenerateRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Regenerates an existing itinerary schedule using updated preferences while optionally preserving chosen days.
    """
    service = ItineraryService.get_service()
    req = payload or ItineraryRegenerateRequest()
    try:
        return await service.regenerate_for_trip(
            trip_id=trip_id,
            user_id=current_user.id,
            custom_instructions=req.custom_instructions,
            feedback=req.feedback,
            preserve_days=req.preserve_days
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

@router.get("/{trip_id}/days/{day_number}", response_model=ItineraryDay)
async def get_day_schedule(
    trip_id: str,
    day_number: int,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves a specific day's schedule by trip ID and 1-based day number.
    """
    service = ItineraryService.get_service()
    try:
        day = await service.get_day_schedule(
            trip_id=trip_id,
            day_number=day_number,
            user_id=current_user.id
        )
        if not day:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Day {day_number} not found for trip '{trip_id}'."
            )
        return day
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)

@router.get("/{trip_or_itin_id}", response_model=ItineraryResponse)
async def get_itinerary(
    trip_or_itin_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves an itinerary by itinerary_id or trip_id and verifies trip ownership.
    """
    # 1. Try directly as itinerary_id
    itin = await repository.get_itinerary_by_id(trip_or_itin_id)
    if itin:
        trip = await repository.get_trip_by_id(itin["trip_id"], user_id=current_user.id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this itinerary."
            )
        return itin

    # 2. Try as trip_id
    trip = await repository.get_trip_by_id(trip_or_itin_id, user_id=current_user.id)
    if trip:
        itins = await repository.get_itineraries_by_trip(trip_or_itin_id)
        if itins and len(itins) > 0:
            return itins[0]

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Itinerary for '{trip_or_itin_id}' not found."
    )

@router.put("/{trip_or_itin_id}", response_model=ItineraryResponse)
async def update_itinerary(
    trip_or_itin_id: str,
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Updates an existing itinerary.
    """
    itin = await repository.get_itinerary_by_id(trip_or_itin_id)
    if not itin:
        itins = await repository.get_itineraries_by_trip(trip_or_itin_id)
        if itins and len(itins) > 0:
            itin = itins[0]
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found.")

    trip = await repository.get_trip_by_id(itin["trip_id"], user_id=current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    updated = await repository.update_itinerary(itin["id"], payload)
    return updated or itin

@router.patch("/{itinerary_id}/activities/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    itinerary_id: str,
    activity_id: str,
    data: ActivityUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Modifies an individual activity without regenerating the entire trip.
    """
    itin = await repository.get_itinerary_by_id(itinerary_id)
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found.")

    trip = await repository.get_trip_by_id(itin["trip_id"], user_id=current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    updated_act = await repository.update_activity(activity_id, data)
    if not updated_act:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")

    return updated_act

@router.delete("/{itinerary_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    itinerary_id: str,
    activity_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Removes an individual activity from a day schedule.
    """
    itin = await repository.get_itinerary_by_id(itinerary_id)
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found.")

    trip = await repository.get_trip_by_id(itin["trip_id"], user_id=current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    success = await repository.delete_activity(activity_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")

    return None

@router.post("/{itinerary_id}/days/{day_id}/regenerate", response_model=ItineraryDayResponse)
async def regenerate_day(
    itinerary_id: str,
    day_id: str,
    data: DayRegenerateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Regenerates a single day's activities based on user prompt while preserving the rest.
    """
    updated_day = await ItineraryService.regenerate_single_day(
        itinerary_id=itinerary_id,
        day_id=day_id,
        user_id=current_user.id,
        feedback=data.feedback,
        preserve_activity_ids=data.preserve_activity_ids
    )
    return updated_day

@router.post("/{itinerary_id}/export")
async def export_itinerary_pdf(
    itinerary_id: str,
    format: str = Query("pdf", description="Export format: pdf, markdown, ics, or json"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Generates and downloads an itinerary dossier in PDF, Markdown, iCalendar (.ics), or JSON format.
    """
    itin = await repository.get_itinerary_by_id(itinerary_id)
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found.")

    trip = await repository.get_trip_by_id(itin["trip_id"])
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip record not found.")

    access = await repository.check_user_trip_access(itin["trip_id"], current_user.id)
    if not access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    buf, media_type, filename = format_exporter.export(trip=trip, itinerary=itin, format_type=format)

    return StreamingResponse(
        buf,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/{trip_id}/refine", response_model=RefinementResponse)
async def refine_itinerary(
    trip_id: str,
    payload: RefinementRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Interactively refines an existing itinerary using conversational user prompts,
    preserving locked activities and saving version snapshots.
    """
    service = ItineraryService.get_service()
    try:
        return await service.refine_itinerary_conversationally(
            trip_id=trip_id,
            user_id=current_user.id,
            message=payload.message,
            target_day=payload.target_day,
            preserve_activity_ids=payload.preserve_activity_ids,
            conversation_history=payload.conversation_history
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Refinement failed: {str(e)}")

@router.get("/{trip_id}/versions", response_model=ItineraryVersionListResponse)
async def get_itinerary_versions(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves the complete snapshot history for a trip's itinerary.
    """
    service = ItineraryService.get_service()
    try:
        return await service.get_versions(trip_id=trip_id, user_id=current_user.id)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)

@router.post("/{trip_id}/versions/{version}/restore", response_model=ItineraryResponse)
async def restore_itinerary_version(
    trip_id: str,
    version: int,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Restores a previous version of an itinerary as the active schedule.
    """
    service = ItineraryService.get_service()
    try:
        return await service.restore_version(trip_id=trip_id, version=version, user_id=current_user.id)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.message)

@router.get("/{trip_id}/versions/{version}")
async def get_single_version_snapshot(
    trip_id: str,
    version: int,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves the detailed data snapshot for a specific version number.
    """
    trip = await repository.get_trip_by_id(trip_id, user_id=current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")

    snapshot = await itinerary_repository.get_version(trip_id, version)
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version {version} not found.")

    return snapshot

