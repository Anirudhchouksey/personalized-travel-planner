from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import settings
from app.core.security import (
    AuthenticatedUser,
    generate_share_token,
    get_current_user,
    hash_share_token
)
from app.db.repository import repository
from app.schemas.share import PublicShareView, ShareCreate, ShareResponse

router = APIRouter(prefix="/api/v1/shares", tags=["Sharing"])

@router.post("", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share(
    data: ShareCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Generates a secure, unguessable public share link for a trip."""
    trip = await repository.get_trip_by_id(data.trip_id, user_id=current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{data.trip_id}' not found or access denied."
        )

    raw_token = generate_share_token()
    token_hash = hash_share_token(raw_token)
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    share_record = await repository.create_share(
        trip_id=data.trip_id,
        owner_id=current_user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )

    frontend_base = settings.FRONTEND_URL.rstrip("/")
    share_url = f"{frontend_base}/share/{raw_token}"

    return ShareResponse(
        id=share_record["id"],
        trip_id=data.trip_id,
        share_token=raw_token,
        share_url=share_url,
        expires_at=expires_at,
        created_at=datetime.fromisoformat(share_record["created_at"])
    )

@router.get("/{share_token}", response_model=PublicShareView)
async def get_shared_trip(share_token: str):
    """Public read-only endpoint returning shared trip and itinerary. Safe from data leaks."""
    token_hash = hash_share_token(share_token)
    share = await repository.get_share_by_token_hash(token_hash)
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared trip link is invalid, expired, or has been revoked by the owner."
        )

    trip = await repository.get_trip_by_id(share["trip_id"])
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip record not found.")

    # Get active itinerary
    itins = await repository.get_itineraries_by_trip(share["trip_id"])
    itinerary = itins[0] if itins else None

    return PublicShareView(
        trip=trip,
        itinerary=itinerary,
        is_shared_view=True
    )

@router.delete("/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(
    share_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Revokes an active share link, preventing further public access."""
    success = await repository.revoke_share(share_id=share_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found or access denied."
        )
    return None
