from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class HistoryItemResponse(BaseModel):
    id: str
    user_id: str
    record_type: str = Field(..., description="trip | itinerary | recommendation")
    title: str
    destination: str
    created_at: str
    summary: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class HistoryResponse(BaseModel):
    history: List[HistoryItemResponse]
    total_count: int
