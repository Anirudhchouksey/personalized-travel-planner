"""
Repository module for itinerary data access and database persistence.
Interfaces with Supabase PostgreSQL with in-memory fallback.
"""
from typing import Any, Dict, List, Optional
from app.db.repository import repository

class ItineraryRepository:
    """
    Data access layer for saved travel itineraries, days, and individual activities.
    """

    async def save_itinerary(self, itinerary_data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves or updates a full itinerary with its child days and activities."""
        return await repository.save_itinerary(itinerary_data)

    async def get_itinerary_by_id(self, itinerary_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single itinerary by primary ID."""
        return await repository.get_itinerary_by_id(itinerary_id)

    async def get_itinerary_by_trip(self, trip_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves the active itinerary associated with a given trip ID."""
        return await self.get_current_itinerary(trip_id)

    async def get_current_itinerary(self, trip_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves the current active itinerary version for a trip."""
        return await repository.get_current_itinerary(trip_id)

    async def create_itinerary_version(
        self,
        trip_id: str,
        structured_itinerary: Dict[str, Any],
        provider: str = "gemini",
        version: int = 1,
        refinement_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a new itinerary version record."""
        return await repository.create_itinerary(
            trip_id=trip_id,
            structured_itinerary=structured_itinerary,
            provider=provider
        )

    async def list_itinerary_versions(self, trip_id: str) -> List[Dict[str, Any]]:
        """Lists all saved versions for a trip."""
        return await repository.get_itinerary_versions(trip_id)

    async def set_current_itinerary(self, trip_id: str, itinerary_id: str) -> bool:
        """Sets an itinerary as the active current version for a trip."""
        return await repository.set_current_itinerary(trip_id, itinerary_id)

    async def save_refinement_history(
        self,
        trip_id: str,
        itinerary_id: Optional[str],
        user_id: str,
        instruction: str,
        summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """Records refinement history entry in database."""
        return await repository.save_refinement_history(
            trip_id=trip_id,
            itinerary_id=itinerary_id,
            user_id=user_id,
            instruction=instruction,
            summary=summary
        )

    async def get_refinement_history(self, trip_id: str) -> List[Dict[str, Any]]:
        """Retrieves conversational refinement history for a trip."""
        return await repository.get_refinement_history(trip_id)

    async def update_itinerary(self, itinerary_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates specific fields of an existing itinerary."""
        return await repository.update_itinerary(itinerary_id, updates)

    async def delete_itinerary(self, itinerary_id: str) -> bool:
        """Deletes an itinerary and its related records."""
        return await repository.delete_itinerary(itinerary_id)

    async def get_day_by_number(self, trip_id: str, day_number: int) -> Optional[Dict[str, Any]]:
        """Retrieves an individual day schedule by trip ID and day number."""
        itin = await self.get_itinerary_by_trip(trip_id)
        if not itin:
            itin = await self.get_itinerary_by_id(trip_id)
        if not itin:
            return None

        days = itin.get("days", [])
        for day in days:
            if day.get("day_number") == day_number:
                return day
        return None

    async def save_version(
        self,
        trip_id: str,
        itinerary_data: Dict[str, Any],
        user_instruction: Optional[str] = None,
        summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """Saves a snapshot of an itinerary version for historical comparison."""
        return await repository.save_itinerary_version(trip_id, itinerary_data, user_instruction, summary)

    async def get_versions(self, trip_id: str) -> List[Dict[str, Any]]:
        """Retrieves all version snapshots for a trip."""
        return await repository.get_itinerary_versions(trip_id)

    async def get_version(self, trip_id: str, version: int) -> Optional[Dict[str, Any]]:
        """Retrieves a specific version snapshot."""
        return await repository.get_itinerary_version(trip_id, version)

    async def restore_version(self, trip_id: str, version: int) -> Optional[Dict[str, Any]]:
        """Restores a previous version as the active itinerary."""
        return await repository.restore_itinerary_version(trip_id, version)

itinerary_repository = ItineraryRepository()
