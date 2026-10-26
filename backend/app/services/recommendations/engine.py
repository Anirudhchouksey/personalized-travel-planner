import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.schemas.recommendation import (
    DestinationDiscoveryRequest,
    DestinationOption,
    DestinationRecommendationResponse,
    ActivityRecommendationRequest,
    ActivityRecommendationResponse,
    ActivityItem,
    RecommendationRefineRequest
)
from app.services.ai.factory import get_llm_provider
from app.services.prompts.builder import PromptBuilder

logger = logging.getLogger(__name__)

class RecommendationEngine:
    @staticmethod
    def calculate_match_score(
        candidate_vibe: str,
        user_vibe: str,
        user_budget: Optional[float],
        estimated_cost: float,
        interests_match_count: int
    ) -> int:
        """Transparent heuristic scoring formula combined with AI generation."""
        score = 65  # baseline
        if candidate_vibe.lower() == user_vibe.lower():
            score += 15
        if user_budget and user_budget >= estimated_cost:
            score += 10
        score += min(10, interests_match_count * 3)
        return min(99, max(60, score))

    @staticmethod
    async def discover_destinations(
        request: DestinationDiscoveryRequest,
        provider_override: Optional[str] = None
    ) -> DestinationRecommendationResponse:
        provider = get_llm_provider(provider_override)
        system_prompt = PromptBuilder.get_system_prompt()
        user_prompt = PromptBuilder.build_destination_discovery_prompt(request.model_dump())

        raw_result = None
        active_provider_name = provider.name
        try:
            raw_result = await asyncio.wait_for(
                provider.generate_structured(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    expected_root_key="recommendations"
                ),
                timeout=18.0
            )
        except Exception as e:
            logger.warning("[RecommendationEngine] Live provider '%s' failed or timed out (%s). Activating resilient curated recommendations.", getattr(provider, "name", "ai"), e)
            try:
                from app.services.ai.mock_provider import MockProvider
                mock_prov = MockProvider()
                raw_result = await mock_prov.generate_structured(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    expected_root_key="recommendations"
                )
                active_provider_name = f"{getattr(provider, 'name', 'ai')}-fallback"
            except Exception as mock_err:
                logger.error("[RecommendationEngine] Fallback also failed: %s", mock_err)
                raw_result = {"recommendations": []}

        if not raw_result or "recommendations" not in raw_result or not raw_result["recommendations"]:
            from app.services.ai.mock_provider import MockProvider
            mock_prov = MockProvider()
            raw_result = await mock_prov.generate_structured(
                prompt=user_prompt,
                system_prompt=system_prompt,
                expected_root_key="recommendations"
            )
            active_provider_name = f"{getattr(provider, 'name', 'ai')}-fallback"

        recs_data = raw_result.get("recommendations", [])
        validated_options: List[DestinationOption] = []

        for r in recs_data:
            option = DestinationOption(
                destination=r.get("destination", "Cultural Gem"),
                country=r.get("country", "Global"),
                match_score=int(r.get("match_score", 90)),
                tagline=r.get("tagline", "Inspiring sights and local culture"),
                highlights=r.get("highlights", ["Historic center", "Local cuisine", "Scenic parks"]),
                estimated_cost_range=r.get("estimated_cost_range", "$1,500 - $2,500"),
                best_season=r.get("best_season", "Spring / Autumn"),
                reasoning=r.get("reasoning", "Fits your preferred vibe, budget, and group pace."),
                suggested_duration_days=int(r.get("suggested_duration_days", request.duration_days)),
                accessibility_rating=r.get("accessibility_rating", "Good")
            )
            validated_options.append(option)

        # Sort by match score descending
        validated_options.sort(key=lambda x: x.match_score, reverse=True)

        return DestinationRecommendationResponse(
            recommendations=validated_options,
            generated_at=datetime.now(timezone.utc).isoformat(),
            provider_used=active_provider_name
        )

    @staticmethod
    async def recommend_activities(
        request: ActivityRecommendationRequest,
        provider_override: Optional[str] = None
    ) -> ActivityRecommendationResponse:
        provider = get_llm_provider(provider_override)
        system_prompt = PromptBuilder.get_system_prompt()
        user_prompt = PromptBuilder.build_activity_recommendations_prompt(request.model_dump())

        raw_result = None
        active_provider_name = provider.name
        try:
            raw_result = await asyncio.wait_for(
                provider.generate_structured(
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    expected_root_key="attractions"
                ),
                timeout=18.0
            )
        except Exception as e:
            logger.warning("[RecommendationEngine] Activity generation failed (%s). Activating resilient fallback.", e)
            from app.services.ai.mock_provider import MockProvider
            raw_result = await MockProvider().generate_structured(
                prompt=user_prompt,
                system_prompt=system_prompt,
                expected_root_key="attractions"
            )
            active_provider_name = f"{getattr(provider, 'name', 'ai')}-fallback"

        if not raw_result:
            from app.services.ai.mock_provider import MockProvider
            raw_result = await MockProvider().generate_structured(
                prompt=user_prompt,
                system_prompt=system_prompt,
                expected_root_key="attractions"
            )

        def parse_items(items_data: list, default_cat: str) -> List[ActivityItem]:
            parsed = []
            for item in items_data:
                parsed.append(ActivityItem(
                    name=item.get("name", "Local Spot"),
                    category=item.get("category", default_cat),
                    description=item.get("description", ""),
                    estimated_cost=float(item.get("estimated_cost", 0.0)),
                    currency=item.get("currency", request.currency),
                    location_name=item.get("location_name"),
                    duration_minutes=int(item.get("duration_minutes", 90)),
                    practical_tips=item.get("practical_tips"),
                    verification_status=item.get("verification_status", "estimated")
                ))
            return parsed

        return ActivityRecommendationResponse(
            destination=request.destination,
            attractions=parse_items(raw_result.get("attractions", []), "attraction"),
            dining=parse_items(raw_result.get("dining", []), "dining"),
            adventure=parse_items(raw_result.get("adventure", []), "adventure"),
            cultural_experiences=parse_items(raw_result.get("cultural_experiences", []), "cultural"),
            practical_tips=raw_result.get("practical_tips", [
                "Book tickets online to avoid queue times.",
                "Public transit passes provide cost-effective city travel."
            ]),
            generated_at=datetime.now(timezone.utc).isoformat(),
            provider_used=active_provider_name
        )

    @staticmethod
    async def refine_recommendations(
        request: RecommendationRefineRequest,
        provider_override: Optional[str] = None
    ) -> Dict[str, Any]:
        provider = get_llm_provider(provider_override)
        system_prompt = PromptBuilder.get_system_prompt()
        user_prompt = PromptBuilder.build_recommendations_refine_prompt(request.model_dump())

        active_provider_name = provider.name
        try:
            raw_result = await asyncio.wait_for(
                provider.generate_structured(
                    prompt=user_prompt,
                    system_prompt=system_prompt
                ),
                timeout=18.0
            )
        except Exception as e:
            logger.warning("[RecommendationEngine] Refine failed (%s). Using fallback.", e)
            from app.services.ai.mock_provider import MockProvider
            raw_result = await MockProvider().generate_structured(
                prompt=user_prompt,
                system_prompt=system_prompt
            )
            active_provider_name = f"{getattr(provider, 'name', 'ai')}-fallback"

        return {
            "destination": request.destination,
            "feedback_applied": request.feedback,
            "result": raw_result,
            "refined_at": datetime.now(timezone.utc).isoformat(),
            "provider_used": active_provider_name
        }

recommendation_engine = RecommendationEngine()
