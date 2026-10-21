from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from app.db.repository import repository
from app.services.ai.factory import get_llm_provider
from app.services.prompts.builder import PromptBuilder

class ItineraryService:
    @staticmethod
    async def generate_for_trip(
        trip_id: str,
        user_id: str,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        # 1. Verify trip exists and user owns it
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip '{trip_id}' not found or access denied."
            )

        # 2. Select AI provider
        provider = get_llm_provider(provider_override)

        # 3. Build prompts
        system_prompt = PromptBuilder.get_system_prompt()
        user_prompt = PromptBuilder.build_itinerary_prompt(trip)

        # 4. Invoke LLM provider
        raw_result = await provider.generate_structured(
            prompt=user_prompt,
            system_prompt=system_prompt,
            expected_root_key="days"
        )

        # 5. Sanitize days data
        days = raw_result.get("days", [])
        if not days:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI provider generated an itinerary with no days. Please retry."
            )

        # Ensure correct dates and day numbers if missing
        for idx, d in enumerate(days, start=1):
            if "day_number" not in d:
                d["day_number"] = idx
            if "activities" not in d or not isinstance(d["activities"], list):
                d["activities"] = []

        # 6. Save in database
        saved_itin = await repository.create_itinerary(
            trip_id=trip_id,
            structured_itinerary=raw_result,
            provider=provider.name
        )

        return saved_itin

    @staticmethod
    async def regenerate_single_day(
        itinerary_id: str,
        day_id: str,
        user_id: str,
        feedback: str,
        preserve_activity_ids: Optional[list] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        # 1. Fetch itinerary
        itin = await repository.get_itinerary_by_id(itinerary_id)
        if not itin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Itinerary '{itinerary_id}' not found."
            )

        # 2. Fetch associated trip and verify ownership
        trip_id = itin.get("trip_id")
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this itinerary."
            )

        # 3. Locate target day
        target_day = None
        for d in itin.get("days", []):
            if str(d.get("id")) == str(day_id):
                target_day = d
                break

        if not target_day:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Day '{day_id}' not found in itinerary."
            )

        # 4. Select provider & build prompt
        provider = get_llm_provider(provider_override)
        system_prompt = PromptBuilder.get_system_prompt()
        prompt = PromptBuilder.build_day_regeneration_prompt(
            day_number=target_day.get("day_number", 1),
            current_day=target_day,
            feedback=feedback,
            destination=trip.get("destination", "Destination"),
            currency=trip.get("currency", "USD"),
            preferences=trip.get("travel_preferences", {})
        )

        # 5. Generate updated day
        result = await provider.generate_structured(
            prompt=prompt,
            system_prompt=system_prompt
        )

        new_acts = result.get("activities", [])
        new_summary = result.get("summary", target_day.get("summary"))
        new_notes = result.get("notes", target_day.get("notes"))

        # 6. Apply updates in repository
        updated_day = await repository.replace_day_activities(
            day_id=day_id,
            new_activities=new_acts,
            new_summary=new_summary,
            new_notes=new_notes
        )

        return updated_day
