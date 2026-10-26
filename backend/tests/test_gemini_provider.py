"""
Automated unit tests for LLMProvider compliance, Gemini Flash provider, and Mock provider.
Runs completely offline without requiring a live Gemini API key.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from google.genai import errors

from app.ai.providers.base import LLMProvider, LLMResponse
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.mock_provider import MockProvider
from app.ai.providers.factory import get_llm_provider
from app.core.exceptions import (
    LLMAuthenticationError,
    LLMQuotaExceededError,
    LLMTimeoutError,
    LLMResponseMalformedError,
)

def test_llm_provider_interface_compliance():
    """Verify that LLMProvider cannot be instantiated directly without abstract methods."""
    with pytest.raises(TypeError):
        LLMProvider()

@pytest.mark.asyncio
async def test_mock_provider_offline_operation():
    """Verify mock provider generates structured itinerary and text without external API calls."""
    provider = MockProvider()
    assert provider.name == "mock"

    text_resp = await provider.generate_text("Plan a trip to Paris")
    assert isinstance(text_resp, LLMResponse)
    assert text_resp.provider == "mock"
    assert "Paris" in text_resp.text or "Travel" in text_resp.text

    structured = await provider.generate_structured("Destination: Rome, Italy. 3 days trip.")
    assert "days" in structured
    assert len(structured["days"]) == 3
    assert structured["days"][0]["day_number"] == 1
    assert len(structured["days"][0]["activities"]) > 0

    health = await provider.check_health()
    assert health["status"] == "healthy"
    assert health["available"] is True

def test_factory_fallback_to_mock_when_unconfigured():
    """Verify factory returns MockProvider when GEMINI_API_KEY is not set."""
    with patch("app.core.config.settings.GEMINI_API_KEY", ""):
        provider = get_llm_provider("gemini")
        assert isinstance(provider, MockProvider)

@pytest.mark.asyncio
async def test_gemini_provider_unconfigured_auth_error():
    """Verify GeminiProvider raises LLMAuthenticationError when no API key is provided."""
    provider = GeminiProvider(api_key="")
    with pytest.raises(LLMAuthenticationError):
        await provider.generate_text("Hello")

@pytest.mark.asyncio
async def test_gemini_provider_async_generation():
    """Verify GeminiProvider calls async API and normalizes response."""
    provider = GeminiProvider(api_key="test-mock-key", model="gemini-2.5-flash")

    mock_response = MagicMock()
    mock_response.text = '{"days": [{"day_number": 1, "title": "Day 1", "activities": []}]}'

    with patch.object(provider, "_ensure_client") as mock_ensure:
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
        mock_ensure.return_value = mock_client

        res = await provider.generate_structured("Destination: Tokyo. 1 day.")
        assert "days" in res
        assert len(res["days"]) == 1

@pytest.mark.asyncio
async def test_gemini_provider_quota_error():
    """Verify HTTP 429 raises LLMQuotaExceededError."""
    provider = GeminiProvider(api_key="test-key")

    with patch.object(provider, "_ensure_client") as mock_ensure:
        mock_client = MagicMock()
        api_err = errors.APIError(429, {"error": {"message": "Resource has been exhausted."}})
        mock_client.aio.models.generate_content = AsyncMock(side_effect=api_err)
        mock_ensure.return_value = mock_client

        with pytest.raises(LLMQuotaExceededError):
            await provider.generate_text("Test quota")

@pytest.mark.asyncio
async def test_gemini_provider_authentication_error():
    """Verify HTTP 401/403 raises LLMAuthenticationError."""
    provider = GeminiProvider(api_key="bad-key")

    with patch.object(provider, "_ensure_client") as mock_ensure:
        mock_client = MagicMock()
        api_err = errors.APIError(401, {"error": {"message": "API key not valid."}})
        mock_client.aio.models.generate_content = AsyncMock(side_effect=api_err)
        mock_ensure.return_value = mock_client

        with pytest.raises(LLMAuthenticationError):
            await provider.generate_text("Test auth")

def test_extract_json_markdown_fences():
    """Verify JSON extraction handles markdown fences and trailing commas cleanly."""
    provider = MockProvider()
    raw = """Here is the itinerary:
```json
{
  "destination": "London",
  "days": [],
}
```
Enjoy your trip!"""
    parsed = provider.extract_json(raw)
    assert parsed["destination"] == "London"

def test_extract_json_malformed():
    """Verify malformed JSON raises LLMResponseMalformedError."""
    provider = MockProvider()
    with pytest.raises(LLMResponseMalformedError):
        provider.extract_json("Just plain text with no brackets at all.")
