from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.schemas.recommendation import (
    DestinationDiscoveryRequest,
    DestinationOption,
    DestinationRecommendationResponse
)
from app.services.ai.factory import get_llm_provider
from app.services.prompts.builder import PromptBuilder

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

        raw_result = await provider.generate_structured(
            prompt=user_prompt,
            system_prompt=system_prompt,
            expected_root_key="recommendations"
        )

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
            provider_used=provider.name
        )

recommendation_engine = RecommendationEngine()
