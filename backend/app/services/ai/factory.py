from typing import Any, Dict, Optional
from app.core.config import settings
from app.services.ai.base import LLMProvider, LLMProviderError
from app.services.ai.groq_provider import GroqProvider
from app.services.ai.huggingface_provider import HuggingFaceProvider
from app.services.ai.ollama_provider import OllamaProvider
from app.services.ai.mock_provider import MockProvider

def get_llm_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """
    Returns an instance of the configured or requested LLM provider.
    Supports environment-based provider selection: groq | huggingface | ollama | mock.
    """
    target = (provider_name or settings.AI_PROVIDER or "mock").lower().strip()

    if target == "groq":
        return GroqProvider()
    elif target in ("huggingface", "hf"):
        return HuggingFaceProvider()
    elif target == "ollama":
        return OllamaProvider()
    elif target == "mock":
        return MockProvider()
    else:
        raise LLMProviderError(f"Unknown AI Provider '{target}'. Supported: groq, huggingface, ollama, mock.")

async def get_all_providers_health() -> Dict[str, Any]:
    """Returns diagnostic health status of all available providers."""
    providers = {
        "groq": GroqProvider(),
        "huggingface": HuggingFaceProvider(),
        "ollama": OllamaProvider(),
        "mock": MockProvider()
    }

    results = {}
    for name, provider in providers.items():
        try:
            results[name] = await provider.check_health()
        except Exception as e:
            results[name] = {
                "provider": name,
                "status": "error",
                "message": str(e)
            }

    return {
        "active_provider": settings.AI_PROVIDER,
        "providers": results
    }
