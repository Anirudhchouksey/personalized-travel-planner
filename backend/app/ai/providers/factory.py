"""
Factory module for instantiating configured LLM Providers.
"""
from typing import Optional
from app.core.config import settings
from app.ai.providers.base import LLMProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.mock_provider import MockProvider

def get_llm_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """
    Factory function that returns the configured LLMProvider instance.
    Defaults to MockProvider when Gemini credentials are not supplied.
    """
    selected = (provider_name or settings.effective_llm_provider).lower()

    if selected == "gemini":
        if settings.GEMINI_API_KEY:
            return GeminiProvider(
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL
            )
        # Graceful zero-cost fallback for local/dev environments without API keys
        return MockProvider(model=f"mock-{settings.GEMINI_MODEL}")

    if selected == "mock":
        return MockProvider()

    # Fallback to mock for unknown or unconfigured providers
    return MockProvider()
