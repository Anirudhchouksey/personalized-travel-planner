from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import AuthenticatedUser, get_current_user
from app.db.repository import repository
from app.schemas.history import HistoryItemResponse, HistoryResponse

router = APIRouter(prefix="/api/v1/history", tags=["History"])

@router.get("", response_model=HistoryResponse)
async def get_history(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves previous trips and itinerary-generation history records for the user."""
    items = await repository.get_user_history(current_user.id)
    return HistoryResponse(
        history=items,
        total_count=len(items)
    )

@router.get("/{history_id}", response_model=HistoryItemResponse)
async def get_history_item(
    history_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves a specific history record by ID."""
    item = await repository.get_history_by_id(history_id, current_user.id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"History record '{history_id}' not found."
        )
    return item
