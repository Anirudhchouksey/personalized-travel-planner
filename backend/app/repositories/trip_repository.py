"""
Trip Repository.
Encapsulates data access and persistence for trips in Supabase PostgreSQL
with in-memory fallback for offline test and local evaluation.
"""
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timezone

from app.core.database import get_client, get_service_client
from app.core.exceptions import EntityNotFoundError, AuthorizationError, DatabaseError
from app.schemas.trip import TripCreate, TripUpdate
from app.db.repository import repository, _mem_trips


class TripRepository:
    """Data access layer for trips."""

    def __init__(self):
        self._client = get_service_client() or get_client()

    @property
    def client(self):
        if self._client is None:
            self._client = get_service_client() or get_client()
        return self._client

    async def create_trip(
        self,
        user_id: str,
        data: Any
    ) -> Dict[str, Any]:
        """Creates a new trip record."""
        return await repository.create_trip(user_id=user_id, data=data)

    async def get_trip_by_id(
        self,
        trip_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieves a trip by ID with optional user authorization check."""
        return await repository.get_trip_by_id(trip_id=trip_id, user_id=user_id)

    async def list_trips_for_user(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Lists all trips belonging to a user ordered by creation date descending."""
        return await repository.get_trips(user_id=user_id)

    async def get_trips(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Alias for list_trips_for_user."""
        return await self.list_trips_for_user(user_id=user_id)

    async def update_trip(
        self,
        trip_id: str,
        user_id: str,
        data: TripUpdate
    ) -> Optional[Dict[str, Any]]:
        """Updates specific fields of an existing trip."""
        return await repository.update_trip(trip_id=trip_id, user_id=user_id, data=data)

    async def delete_trip(
        self,
        trip_id: str,
        user_id: str
    ) -> bool:
        """Deletes a trip and cascades associated itineraries."""
        return await repository.delete_trip(trip_id=trip_id, user_id=user_id)


trip_repository = TripRepository()
