import json
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

class LLMProviderError(Exception):
    """Exception raised when an AI provider fails or exhausts retries."""
    pass

class LLMProvider(ABC):
    """Abstract interface for all travel planner LLM providers."""

    name: str = "base"

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        expected_root_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a structured dictionary conforming to expected schema.
        Handles JSON extraction, repairs markdown blocks, and bounds retries.
        """
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Returns provider status, configured model, and connectivity status."""
        pass

    def extract_json(self, text: str) -> Dict[str, Any]:
        """Extracts and parses JSON from raw LLM output, stripping markdown fences if present."""
        cleaned = text.strip()
        # Look for markdown ```json ... ``` blocks
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if json_match:
            cleaned = json_match.group(1).strip()
        else:
            # Try to locate the outermost { ... } or [ ... ]
            start_bracket = cleaned.find("{")
            end_bracket = cleaned.rfind("}")
            if start_bracket != -1 and end_bracket != -1 and end_bracket > start_bracket:
                cleaned = cleaned[start_bracket:end_bracket + 1]

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as err:
            raise LLMProviderError(f"Failed to parse LLM response as JSON: {err}. Raw excerpt: {cleaned[:300]}")
