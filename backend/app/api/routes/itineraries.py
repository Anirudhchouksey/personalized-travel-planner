from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from app.core.security import AuthenticatedUser, get_current_user
from app.db.repository import repository
from app.schemas.itinerary import (
    ActivityResponse,
    ActivityUpdate,
    DayRegenerateRequest,
    ItineraryDayResponse,
    ItineraryResponse
)
from app.services.itinerary.generator import ItineraryService
from app.services.export.pdf_generator import pdf_exporter

router = APIRouter(prefix="/api/v1/itineraries", tags=["Itineraries"])

@router.get("/{itinerary_id}", response_model=ItineraryResponse)
async def get_itinerary(
    itinerary_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves an itinerary and verifies trip ownership."""
    itin = await repository.get_itinerary_by_id(itinerary_id)
    if not itin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary '{itinerary_id}' not found."
        )

    # Verify ownership of parent trip
    trip = await repository.get_trip_by_id(itin["trip_id"], user_id=current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this itinerary."
        )

    return itin

@router.patch("/{itinerary_id}/activities/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    itinerary_id: str,
    activity_id: str,
    data: ActivityUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Modifies an individual activity without regenerating the entire trip."""
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
    """Removes an individual activity from a day schedule."""
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
    """Regenerates a single day's activities based on user prompt while preserving the rest."""
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
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Generates and downloads a publication-grade PDF itinerary dossier."""
    itin = await repository.get_itinerary_by_id(itinerary_id)
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found.")

    trip = await repository.get_trip_by_id(itin["trip_id"], user_id=current_user.id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    pdf_buffer = pdf_exporter.generate_pdf(trip=trip, itinerary=itin)
    safe_filename = f"Itinerary_{trip.get('destination', 'Trip').replace(' ', '_')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"}
    )
