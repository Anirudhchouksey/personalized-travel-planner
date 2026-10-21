from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.trip import TripResponse
from app.schemas.itinerary import ItineraryResponse

class ShareCreate(BaseModel):
    trip_id: str
    expires_in_days: Optional[int] = Field(default=30, ge=1, le=365)

class ShareResponse(BaseModel):
    id: str
    trip_id: str
    share_token: str
    share_url: str
    expires_at: Optional[datetime]
    created_at: datetime

class PublicShareView(BaseModel):
    trip: TripResponse
    itinerary: Optional[ItineraryResponse] = None
    is_shared_view: bool = True
