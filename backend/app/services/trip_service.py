"""
Trip Service.
Coordinates trip validation, persistence, ownership verification,
and orchestrates initial itinerary generation workflows.
"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from app.core.exceptions import (
    EntityNotFoundError,
    AuthorizationError,
    ValidationError,
    AppException,
)
from app.repositories.trip_repository import trip_repository
from app.repositories.itinerary_repository import itinerary_repository
from app.schemas.trip import TripCreate, TripUpdate, TripResponse


class TripService:
    """Business logic coordinator for trips."""

    @staticmethod
    def validate_trip_constraints(
        start_date: Any,
        end_date: Any,
        traveler_count: int,
        budget_amount: Optional[float] = None
    ) -> None:
        """Enforces business and date consistency constraints."""
        s_date = start_date if isinstance(start_date, (date, datetime)) else datetime.fromisoformat(str(start_date)).date()
        e_date = end_date if isinstance(end_date, (date, datetime)) else datetime.fromisoformat(str(end_date)).date()

        if e_date < s_date:
            raise ValidationError("Trip return date must be on or after the departure date.")

        if traveler_count < 1:
            raise ValidationError("Traveler count must be at least 1.")

        if budget_amount is not None and budget_amount < 0:
            raise ValidationError("Trip budget cannot be negative.")

    @classmethod
    async def create_trip(
        cls,
        user_id: str,
        data: TripCreate,
        generate_initial_itinerary: bool = False,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Validates input, persists trip, and optionally triggers initial itinerary generation."""
        cls.validate_trip_constraints(
            start_date=data.start_date,
            end_date=data.end_date,
            traveler_count=data.traveler_count,
            budget_amount=data.budget_amount
        )

        trip = await trip_repository.create_trip(user_id=user_id, data=data)

        if generate_initial_itinerary:
            try:
                from app.services.itinerary_service import ItineraryService
                service = ItineraryService.get_service(provider_override)
                await service.generate_for_trip(
                    trip_id=trip["id"],
                    user_id=user_id,
                    provider_override=provider_override
                )
            except Exception as e:
                # Trip is saved safely; log generation issue without failing creation
                print(f"[TripService] Warning: Initial itinerary generation failed: {e}")

        return trip

    @classmethod
    async def get_trip(
        cls,
        trip_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Retrieves a trip and enforces owner authorization."""
        trip = await trip_repository.get_trip_by_id(trip_id=trip_id)
        if not trip:
            raise EntityNotFoundError("Trip", trip_id)

        if trip.get("user_id") != user_id:
            raise AuthorizationError(f"You do not have permission to access trip '{trip_id}'.")

        return trip

    @classmethod
    async def list_trips(
        cls,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Returns all trips for the authenticated user."""
        return await trip_repository.list_trips_for_user(user_id=user_id)

    @classmethod
    async def update_trip(
        cls,
        trip_id: str,
        user_id: str,
        data: TripUpdate
    ) -> Dict[str, Any]:
        """Validates updates and updates trip in database."""
        existing = await cls.get_trip(trip_id=trip_id, user_id=user_id)

        s_date = data.start_date or existing.get("start_date")
        e_date = data.end_date or existing.get("end_date")
        t_count = data.traveler_count or existing.get("traveler_count", 1)
        b_amount = data.budget_amount if data.budget_amount is not None else existing.get("budget_amount")

        cls.validate_trip_constraints(
            start_date=s_date,
            end_date=e_date,
            traveler_count=t_count,
            budget_amount=b_amount
        )

        updated = await trip_repository.update_trip(trip_id=trip_id, user_id=user_id, data=data)
        if not updated:
            raise EntityNotFoundError("Trip", trip_id)

        return updated

    @classmethod
    async def delete_trip(
        cls,
        trip_id: str,
        user_id: str
    ) -> bool:
        """Verifies ownership and deletes trip and all cascading itineraries."""
        await cls.get_trip(trip_id=trip_id, user_id=user_id)
        success = await trip_repository.delete_trip(trip_id=trip_id, user_id=user_id)
        return success

    @classmethod
    async def get_trip_itineraries(
        cls,
        trip_id: str,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Verifies trip ownership and retrieves associated itineraries."""
        await cls.get_trip(trip_id=trip_id, user_id=user_id)
        from app.db.repository import repository
        return await repository.get_itineraries_by_trip(trip_id)

    @classmethod
    async def add_collaborator(
        cls,
        trip_id: str,
        user_id: str,
        email: str,
        role: str = "viewer"
    ) -> Dict[str, Any]:
        """Trip owner invites/adds a collaborator with viewer or editor role."""
        await cls.get_trip(trip_id=trip_id, user_id=user_id)
        from app.db.repository import repository
        return await repository.add_collaborator(trip_id=trip_id, email=email, role=role)

    @classmethod
    async def list_collaborators(
        cls,
        trip_id: str,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Lists all collaborators for a trip if the requesting user has access."""
        from app.db.repository import repository
        access = await repository.check_user_trip_access(trip_id=trip_id, user_id=user_id)
        if not access:
            raise AuthorizationError("Access denied: you are not a member of this trip.")
        return await repository.get_collaborators(trip_id=trip_id)

    @classmethod
    async def update_collaborator_role(
        cls,
        trip_id: str,
        collaborator_id: str,
        user_id: str,
        role: str
    ) -> Dict[str, Any]:
        """Trip owner updates a collaborator's role."""
        await cls.get_trip(trip_id=trip_id, user_id=user_id)
        from app.db.repository import repository
        updated = await repository.update_collaborator_role(
            collaborator_id=collaborator_id,
            trip_id=trip_id,
            role=role
        )
        if not updated:
            raise EntityNotFoundError("Collaborator", collaborator_id)
        return updated

    @classmethod
    async def remove_collaborator(
        cls,
        trip_id: str,
        collaborator_id: str,
        user_id: str
    ) -> bool:
        """Trip owner removes a collaborator from the trip."""
        await cls.get_trip(trip_id=trip_id, user_id=user_id)
        from app.db.repository import repository
        success = await repository.remove_collaborator(collaborator_id=collaborator_id, trip_id=trip_id)
        if not success:
            raise EntityNotFoundError("Collaborator", collaborator_id)
        return True


trip_service = TripService()
