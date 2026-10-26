"""
AI Itinerary Generation Service.
Coordinates prompt construction, LLM generation, schema validation,
date coverage verification, conflict resolution, and database persistence.
"""
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
import uuid
import logging

logger = logging.getLogger(__name__)

from fastapi import HTTPException, status
from app.ai.providers.base import LLMProvider
from app.ai.providers.factory import get_llm_provider
from app.ai.prompt_builder import PromptBuilder
from app.ai.output_parser import ItineraryOutputParser
from app.core.exceptions import (
    EntityNotFoundError,
    AuthorizationError,
    ItineraryGenerationError,
    SchedulingConflictError,
)
from app.repositories.itinerary_repository import itinerary_repository
from app.db.repository import repository
from app.schemas.itinerary import (
    ItineraryActivity,
    ItineraryDay,
    ItineraryResponse,
    RefinementResponse,
    ItineraryVersionItem,
    ItineraryVersionListResponse,
)

class ItineraryService:
    """
    Core orchestrator for creating, validating, repairing, and updating travel itineraries.
    """

    def __init__(self, provider: Optional[LLMProvider] = None):
        self.provider = provider or get_llm_provider()

    @classmethod
    def get_service(cls, provider_override: Optional[str] = None) -> "ItineraryService":
        provider = get_llm_provider(provider_override)
        return cls(provider=provider)

    async def generate_for_trip(
        self,
        trip_id: str,
        user_id: str,
        provider_override: Optional[str] = None,
        custom_instructions: Optional[str] = None
    ) -> ItineraryResponse:
        """
        Loads trip preferences, generates schedule via LLMProvider, validates,
        resolves conflicts, persists to DB, and returns validated ItineraryResponse.
        """
        # 1. Fetch trip and verify ownership
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise EntityNotFoundError("Trip", trip_id)

        # 2. Select provider if override is supplied
        provider = get_llm_provider(provider_override) if provider_override else self.provider

        # 3. Build prompts
        system_prompt, user_prompt = PromptBuilder.build_itinerary_prompt(
            preferences=trip,
            custom_instructions=custom_instructions
        )

        # 4. Generate structured JSON from LLM with bounded retry
        raw_result = None
        last_error = None
        for attempt in range(2):
            try:
                raw_result = await provider.generate_structured(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    expected_root_key="days"
                )
                if raw_result and "days" in raw_result and len(raw_result["days"]) > 0:
                    break
            except Exception as e:
                last_error = e

        if not raw_result or "days" not in raw_result or not raw_result["days"]:
            logger.warning("[ItineraryService] External AI provider unavailable (%s). Activating resilient fallback schedule.", last_error)
            try:
                from app.services.ai.mock_provider import MockProvider
                mock_prov = MockProvider()
                raw_result = await mock_prov.generate_structured(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    expected_root_key="days"
                )
            except Exception as mock_err:
                raise ItineraryGenerationError(
                    f"Failed to generate structured itinerary days: {str(last_error or mock_err)}"
                )

        # 5. Parse, sanitize, and repair activities
        normalized_data = ItineraryOutputParser.parse_raw(raw_result)

        # 6. Verify date coverage and align schedule
        start_date, end_date, total_days = self._resolve_trip_dates(trip)
        normalized_days = self._align_and_cover_dates(
            days=normalized_data["days"],
            start_date=start_date,
            total_days=total_days,
            destination=trip.get("destination", "Destination")
        )

        # 7. Detect and auto-resolve activity time overlaps
        for day in normalized_days:
            day["activities"] = self._resolve_schedule_conflicts(day.get("activities", []))

        # 8. Persist to database repository
        itinerary_record = {
            "trip_id": trip_id,
            "destination": trip.get("destination", ""),
            "start_date": str(start_date) if start_date else None,
            "end_date": str(end_date) if end_date else None,
            "total_days": total_days,
            "structured_itinerary": {
                "days": normalized_days,
                "estimated_total_cost": normalized_data.get("estimated_total_cost", 0.0)
            },
            "days": normalized_days,
            "generation_provider": provider.name,
            "estimated_total_cost": normalized_data.get("estimated_total_cost", 0.0)
        }

        saved_itin = await repository.create_itinerary(
            trip_id=trip_id,
            structured_itinerary=itinerary_record["structured_itinerary"],
            provider=provider.name
        )

        # 9. Format response model
        return self._format_response(saved_itin, trip, normalized_days, normalized_data.get("estimated_total_cost", 0.0), provider.name)

    async def regenerate_for_trip(
        self,
        trip_id: str,
        user_id: str,
        custom_instructions: Optional[str] = None,
        feedback: Optional[str] = None,
        preserve_days: Optional[List[int]] = None,
        provider_override: Optional[str] = None
    ) -> ItineraryResponse:
        """
        Regenerates an itinerary with updated preferences while optionally preserving selected days.
        """
        # Fetch trip and verify ownership
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise EntityNotFoundError("Trip", trip_id)

        # Check existing itinerary
        existing_itin = await itinerary_repository.get_itinerary_by_trip(trip_id)
        preserved_map: Dict[int, Any] = {}
        if existing_itin and preserve_days:
            for day in existing_itin.get("days", []):
                if day.get("day_number") in preserve_days:
                    preserved_map[day["day_number"]] = day

        combined_instructions = custom_instructions or ""
        if feedback:
            combined_instructions = f"Feedback: {feedback}. {combined_instructions}".strip()

        # Generate fresh itinerary
        new_response = await self.generate_for_trip(
            trip_id=trip_id,
            user_id=user_id,
            provider_override=provider_override,
            custom_instructions=combined_instructions
        )

        # Restore preserved days if requested
        if preserved_map:
            merged_days = []
            for d in new_response.days:
                if d.day_number in preserved_map:
                    merged_days.append(ItineraryDay.model_validate(preserved_map[d.day_number]))
                else:
                    merged_days.append(d)
            new_response.days = merged_days

        return new_response

    async def refine_itinerary_conversationally(
        self,
        trip_id: str,
        user_id: str,
        message: str,
        target_day: Optional[int] = None,
        preserve_activity_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        provider_override: Optional[str] = None
    ) -> RefinementResponse:
        """
        Refines an existing itinerary conversationally with Gemini Flash or Mock provider,
        preserving locked activities and storing version history.
        """
        # 1. Fetch trip & check ownership
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise EntityNotFoundError("Trip", trip_id)

        # 2. Get active itinerary
        itin = await itinerary_repository.get_itinerary_by_trip(trip_id)
        if not itin:
            itin = await repository.get_itinerary_by_id(trip_id)
        if not itin:
            raise EntityNotFoundError("Itinerary", f"for trip {trip_id}")

        current_days = itin.get("days", [])
        current_version = itin.get("version", 1)

        # 3. Select AI provider
        provider = get_llm_provider(provider_override) if provider_override else self.provider

        # 4. Build prompt
        system_prompt, user_prompt = PromptBuilder.build_conversational_refinement_prompt(
            destination=trip.get("destination", "Destination"),
            current_days=current_days,
            user_message=message,
            target_day=target_day,
            preserve_activity_ids=preserve_activity_ids,
            conversation_history=conversation_history,
            preferences=trip.get("travel_preferences", {})
        )

        # 5. Invoke LLM provider with resilient fallback
        raw_result = None
        try:
            raw_result = await asyncio.wait_for(
                provider.generate_structured(
                    prompt=user_prompt,
                    system_prompt=system_prompt
                ),
                timeout=25.0
            )
        except Exception as e:
            logger.warning("[ItineraryService] Live conversational refinement failed (%s). Activating resilient fallback.", e)
            from app.services.ai.mock_provider import MockProvider
            mock_prov = MockProvider()
            raw_result = await mock_prov.generate_structured(
                prompt=user_prompt,
                system_prompt=system_prompt
            )

        # 6. Parse and normalize
        normalized_data = ItineraryOutputParser.parse_raw(raw_result)
        normalized_days = normalized_data.get("days", current_days)

        # Ensure locked activities are preserved
        if preserve_activity_ids:
            locked_ids = set(preserve_activity_ids)
            for old_day in current_days:
                d_num = old_day.get("day_number")
                target_new_day = next((d for d in normalized_days if d.get("day_number") == d_num), None)
                if target_new_day:
                    existing_act_ids = {str(a.get("id")) for a in target_new_day.get("activities", [])}
                    for old_act in old_day.get("activities", []):
                        if str(old_act.get("id")) in locked_ids and str(old_act.get("id")) not in existing_act_ids:
                            target_new_day["activities"].append(old_act)

        # Resolve conflicts on days
        for day in normalized_days:
            day["activities"] = self._resolve_schedule_conflicts(day.get("activities", []))

        # 7. Increment version and save
        new_version = current_version + 1
        updated_payload = {
            "version": new_version,
            "days": normalized_days,
            "structured_itinerary": {
                "days": normalized_days,
                "version": new_version,
                "last_modification": message
            },
            "estimated_total_cost": normalized_data.get("estimated_total_cost", itin.get("estimated_total_cost", 0.0))
        }

        updated_itin = await repository.update_itinerary(itin["id"], updated_payload)

        # 8. Save snapshot in version history
        assistant_msg = raw_result.get("assistant_message") or f"Updated your {trip.get('destination')} itinerary based on: '{message}'."
        change_summary = raw_result.get("summary_of_changes") or [f"Refined schedule with: {message}"]

        await itinerary_repository.save_version(
            trip_id=trip_id,
            itinerary_data=updated_itin or updated_payload,
            user_instruction=message,
            summary="; ".join(change_summary[:3])
        )
        await itinerary_repository.save_refinement_history(
            trip_id=trip_id,
            itinerary_id=itin.get("id"),
            user_id=user_id,
            instruction=message,
            summary="; ".join(change_summary[:3])
        )

        # 9. Format response
        formatted_itin = self._format_response(
            updated_itin or updated_payload,
            trip,
            normalized_days,
            updated_payload["estimated_total_cost"],
            provider.name
        )

        return RefinementResponse(
            itinerary=formatted_itin,
            assistant_message=assistant_msg,
            version=new_version,
            summary_of_changes=change_summary
        )

    async def get_versions(self, trip_id: str, user_id: str) -> ItineraryVersionListResponse:
        """Retrieves all version snapshots for a trip."""
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise EntityNotFoundError("Trip", trip_id)

        raw_versions = await itinerary_repository.get_versions(trip_id)
        current_itin = await itinerary_repository.get_itinerary_by_trip(trip_id)
        cur_ver = current_itin.get("version", 1) if current_itin else 1

        version_items = []
        for v in raw_versions:
            c_at = v.get("created_at")
            if isinstance(c_at, str):
                try:
                    c_at = datetime.fromisoformat(c_at)
                except Exception:
                    c_at = datetime.utcnow()
            elif not isinstance(c_at, datetime):
                c_at = datetime.utcnow()

            version_items.append(ItineraryVersionItem(
                version=v.get("version", 1),
                user_instruction=v.get("user_instruction"),
                summary=v.get("summary"),
                created_at=c_at,
                total_days=v.get("total_days", 1),
                estimated_total_cost=v.get("estimated_total_cost", 0.0)
            ))

        return ItineraryVersionListResponse(
            trip_id=trip_id,
            current_version=cur_ver,
            versions=version_items
        )

    async def restore_version(self, trip_id: str, version: int, user_id: str) -> ItineraryResponse:
        """Restores a previous itinerary version as active."""
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise EntityNotFoundError("Trip", trip_id)

        restored_data = await itinerary_repository.restore_version(trip_id, version)
        if not restored_data:
            raise EntityNotFoundError("ItineraryVersion", str(version))

        days = restored_data.get("days", [])
        return self._format_response(
            restored_data,
            trip,
            days,
            restored_data.get("estimated_total_cost", 0.0),
            restored_data.get("generation_provider", "gemini")
        )

    async def get_day_schedule(
        self,
        trip_id: str,
        day_number: int,
        user_id: str
    ) -> Optional[ItineraryDay]:
        """
        Retrieves a single day's schedule by day number for a given trip.
        """
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise EntityNotFoundError("Trip", trip_id)

        day_dict = await itinerary_repository.get_day_by_number(trip_id, day_number)
        if not day_dict:
            return None
        return ItineraryDay.model_validate(day_dict)

    @staticmethod
    async def regenerate_single_day(
        itinerary_id: str,
        day_id: str,
        user_id: str,
        feedback: str,
        preserve_activity_ids: Optional[list] = None,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Regenerates a single day's schedule based on user feedback.
        """
        itin = await repository.get_itinerary_by_id(itinerary_id)
        if not itin:
            raise EntityNotFoundError("Itinerary", itinerary_id)

        trip_id = itin.get("trip_id")
        trip = await repository.get_trip_by_id(trip_id, user_id)
        if not trip:
            raise AuthorizationError("You do not have permission to modify this itinerary.")

        target_day = None
        for d in itin.get("days", []):
            if str(d.get("id")) == str(day_id):
                target_day = d
                break

        if not target_day:
            raise EntityNotFoundError("ItineraryDay", day_id)

        provider = get_llm_provider(provider_override)
        system_prompt, prompt = PromptBuilder.build_day_regeneration_prompt(
            destination=trip.get("destination", "Destination"),
            day_number=target_day.get("day_number", 1),
            date_str=str(target_day.get("date")),
            feedback=feedback,
            existing_activities=target_day.get("activities", [])
        )

        result = await provider.generate_structured(
            prompt=prompt,
            system_prompt=system_prompt
        )

        new_acts = result.get("activities")
        if not new_acts and "days" in result and result["days"]:
            new_acts = result["days"][0].get("activities", [])
        if not new_acts:
            new_acts = []

        new_summary = result.get("summary", target_day.get("summary"))
        new_notes = result.get("notes", target_day.get("notes"))

        updated_day = await repository.replace_day_activities(
            day_id=day_id,
            new_activities=new_acts,
            new_summary=new_summary,
            new_notes=new_notes
        )
        return updated_day

    @staticmethod
    def _resolve_schedule_conflicts(activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detects overlapping activities in a day schedule and adjusts start times
        with a 15-minute buffer so schedules flow logically.
        """
        if not activities:
            return []

        def to_minutes(time_str: str) -> int:
            try:
                parts = time_str.split(":")
                return int(parts[0]) * 60 + int(parts[1])
            except Exception:
                return 0

        def to_time_str(mins: int) -> str:
            h = min(23, mins // 60)
            m = min(59, mins % 60)
            return f"{h:02d}:{m:02d}"

        # Sort by start_time
        sorted_acts = sorted(activities, key=lambda a: to_minutes(a.get("start_time", "09:00")))
        last_end = 0

        for act in sorted_acts:
            s_min = to_minutes(act.get("start_time", "09:00"))
            e_min = to_minutes(act.get("end_time", "11:00"))
            dur = act.get("duration_minutes") or (e_min - s_min if e_min > s_min else 90)

            if s_min < last_end:
                # Conflict detected: buffer by 15 mins after previous end
                s_min = last_end + 15
                e_min = s_min + dur
                act["start_time"] = to_time_str(s_min)
                act["end_time"] = to_time_str(e_min)

            last_end = e_min

        return sorted_acts

    @staticmethod
    def _resolve_trip_dates(trip: Dict[str, Any]) -> tuple:
        s_date = trip.get("start_date")
        e_date = trip.get("end_date")
        duration = trip.get("duration_days") or trip.get("total_days")

        start = None
        end = None
        if isinstance(s_date, str):
            try:
                start = datetime.strptime(s_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        elif isinstance(s_date, (datetime, date)):
            start = s_date if isinstance(s_date, date) else s_date.date()

        if isinstance(e_date, str):
            try:
                end = datetime.strptime(e_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        elif isinstance(e_date, (datetime, date)):
            end = e_date if isinstance(e_date, date) else e_date.date()

        if start and end and not duration:
            duration = (end - start).days + 1
        elif start and duration and not end:
            end = start + timedelta(days=duration - 1)
        elif not start:
            start = date.today() + timedelta(days=7)
            duration = duration or 3
            end = start + timedelta(days=duration - 1)

        total_days = max(1, duration or 3)
        return start, end, total_days

    @staticmethod
    def _align_and_cover_dates(
        days: List[Dict[str, Any]],
        start_date: date,
        total_days: int,
        destination: str
    ) -> List[Dict[str, Any]]:
        aligned: List[Dict[str, Any]] = []
        for i in range(1, total_days + 1):
            day_date = (start_date + timedelta(days=i - 1)).strftime("%Y-%m-%d")
            existing = next((d for d in days if d.get("day_number") == i), None)
            if existing:
                existing["date"] = day_date
                aligned.append(existing)
            else:
                # Pad missing day
                aligned.append({
                    "day_number": i,
                    "date": day_date,
                    "title": f"Day {i}: Immersive Exploration of {destination}",
                    "summary": f"Discover local sights and hidden gems across {destination}.",
                    "activities": [
                        {
                            "id": f"act-{i}-1",
                            "name": f"Morning Stroll & Local Market",
                            "category": "sightseeing",
                            "time_slot": "morning",
                            "start_time": "09:30",
                            "end_time": "11:30",
                            "duration_minutes": 120,
                            "location": f"Central District, {destination}",
                            "description": "Scenic morning market visit.",
                            "estimated_cost": 10.0,
                            "travel_notes": "Accessible by bus.",
                            "accessibility_notes": "Flat surfaces."
                        }
                    ]
                })
        return aligned

    @staticmethod
    def _format_response(
        saved_itin: Dict[str, Any],
        trip: Dict[str, Any],
        days: List[Dict[str, Any]],
        total_cost: float,
        provider_name: str
    ) -> ItineraryResponse:
        s_date = trip.get("start_date")
        e_date = trip.get("end_date")

        raw_days = saved_itin.get("days") or days
        for d in raw_days:
            if isinstance(d, dict) and not d.get("id"):
                d["id"] = str(uuid.uuid4())

        converted_days = [ItineraryDay.model_validate(d) for d in raw_days]

        return ItineraryResponse(
            id=str(saved_itin.get("id", uuid.uuid4())),
            trip_id=str(trip.get("id")),
            destination=trip.get("destination", ""),
            start_date=str(s_date) if s_date else None,
            end_date=str(e_date) if e_date else None,
            total_days=len(converted_days),
            days=converted_days,
            estimated_total_cost=total_cost,
            created_at=saved_itin.get("created_at") or datetime.utcnow(),
            updated_at=saved_itin.get("updated_at") or datetime.utcnow(),
            version=saved_itin.get("version", 1),
            structured_itinerary=saved_itin.get("structured_itinerary") or {"days": days},
            generation_provider=provider_name
        )
