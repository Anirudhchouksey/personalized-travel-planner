"""
Google Gemini Flash LLM Provider implementation using the official google-genai SDK.
"""
import asyncio
from typing import Any, Dict, Optional
from google import genai
from google.genai import types
from google.genai import errors

from app.core.config import settings
from app.core.exceptions import (
    LLMProviderError,
    LLMAuthenticationError,
    LLMQuotaExceededError,
    LLMTimeoutError,
    LLMResponseMalformedError,
)
from app.ai.providers.base import LLMProvider, LLMResponse

class GeminiProvider(LLMProvider):
    """
    LLM Provider that interfaces with Google Gemini Flash models via google-genai.
    Supports asynchronous generation, strict JSON schema output, and error isolation.
    """

    name: str = "gemini"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = 30.0
    ):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model if model is not None else (settings.GEMINI_MODEL or "gemini-2.5-flash")
        self.timeout_seconds = timeout_seconds

        if not self.api_key:
            self._client = None
        else:
            self._client = genai.Client(api_key=self.api_key)

    def _sanitize_message(self, message: str) -> str:
        """Strips out sensitive API keys from error messages before exposure."""
        if not message:
            return ""
        if self.api_key and len(self.api_key) > 6:
            message = message.replace(self.api_key, "[REDACTED_API_KEY]")
        return message

    def _ensure_client(self) -> genai.Client:
        if not self.api_key:
            raise LLMAuthenticationError(
                "Gemini API key is not configured. Set GEMINI_API_KEY in your backend/.env file (obtain a key from https://aistudio.google.com/apikey)."
            )
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _get_candidate_models(self) -> list[str]:
        """Returns prioritized candidate models for resilient generation during demand spikes."""
        candidates = [self.model]
        # High-availability Flash Lite & Flash fallback models
        for fb in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash"]:
            if fb not in candidates:
                candidates.append(fb)
        return candidates

    async def generate_text(
        self,
        prompt: str,
        settings_override: Optional[Dict[str, Any]] = None
    ) -> LLMResponse:
        """
        Sends an asynchronous text generation request to Gemini with automatic model failover.
        """
        client = self._ensure_client()
        cfg_params = settings_override or {}
        temperature = cfg_params.get("temperature", 0.4)
        max_output_tokens = cfg_params.get("max_output_tokens", 4096)
        system_instruction = cfg_params.get("system_instruction")

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            system_instruction=system_instruction
        )

        candidates = self._get_candidate_models()
        last_error = None

        for model_name in candidates:
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config
                    ),
                    timeout=self.timeout_seconds
                )
                raw_text = response.text or ""
                return LLMResponse(
                    text=raw_text,
                    model=model_name,
                    provider=self.name,
                    usage={"prompt_tokens": None, "completion_tokens": None}
                )
            except asyncio.TimeoutError:
                last_error = LLMTimeoutError("Gemini request timed out after 30 seconds.")
                continue
            except errors.APIError as err:
                code = getattr(err, "code", 500)
                # If high demand (503), rate limit (429), or retired model (404), try next candidate model
                if code in (503, 429, 404, 500) and model_name != candidates[-1]:
                    continue
                self._handle_api_error(err)
            except Exception as ex:
                if model_name != candidates[-1]:
                    continue
                raise LLMProviderError(f"Gemini generation error: {self._sanitize_message(str(ex))}")

        if last_error:
            raise last_error
        raise LLMProviderError("All Gemini candidate models failed to respond.")

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        expected_root_key: Optional[str] = None,
        settings_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates structured JSON directly from Gemini with automatic model failover and list normalization.
        """
        client = self._ensure_client()
        cfg_params = settings_override or {}
        temperature = cfg_params.get("temperature", 0.2)

        config = types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json",
            system_instruction=system_prompt
        )

        candidates = self._get_candidate_models()
        last_error = None

        for model_name in candidates:
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config
                    ),
                    timeout=self.timeout_seconds
                )
                raw_text = response.text or "{}"
                parsed = self.extract_json(raw_text)

                if isinstance(parsed, list):
                    parsed = {expected_root_key or "days": parsed}
                elif expected_root_key and expected_root_key not in parsed:
                    # If wrapped under a different key or root list, check
                    if isinstance(parsed, dict) and len(parsed) == 1:
                        first_val = next(iter(parsed.values()))
                        if isinstance(first_val, dict) and expected_root_key in first_val:
                            parsed = first_val
                        elif isinstance(first_val, list):
                            parsed = {expected_root_key: first_val}

                return parsed
            except asyncio.TimeoutError:
                last_error = LLMTimeoutError("Gemini structured request timed out.")
                continue
            except errors.APIError as err:
                code = getattr(err, "code", 500)
                if code in (503, 429, 404, 500) and model_name != candidates[-1]:
                    continue
                self._handle_api_error(err)
            except LLMResponseMalformedError:
                if model_name != candidates[-1]:
                    continue
                raise
            except Exception as ex:
                if model_name != candidates[-1]:
                    continue
                raise LLMProviderError(f"Gemini structured generation failed: {self._sanitize_message(str(ex))}")

        if last_error:
            raise last_error
        raise LLMProviderError("All Gemini candidate models failed to generate structured response.")

    async def check_health(self) -> Dict[str, Any]:
        """
        Validates connectivity and credentials across candidate models without leaking keys.
        """
        if not self.api_key:
            return {
                "status": "unconfigured",
                "provider": self.name,
                "model": self.model,
                "detail": "GEMINI_API_KEY environment variable is not set."
            }

        candidates = self._get_candidate_models()
        client = self._ensure_client()

        for m in candidates:
            try:
                resp = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=m,
                        contents="ping",
                        config=types.GenerateContentConfig(max_output_tokens=5)
                    ),
                    timeout=10.0
                )
                if resp and resp.text:
                    return {
                        "status": "healthy",
                        "provider": self.name,
                        "model": m,
                        "available": True
                    }
            except Exception:
                continue

        return {
            "status": "error",
            "provider": self.name,
            "model": self.model,
            "detail": "Failed to connect to Gemini API."
        }

    def _handle_api_error(self, err: errors.APIError):
        code = getattr(err, "code", 500)
        msg = self._sanitize_message(getattr(err, "message", str(err)))
        if code in (401, 403):
            raise LLMAuthenticationError("Authentication with Gemini failed: check your GEMINI_API_KEY.")
        elif code == 429:
            raise LLMQuotaExceededError("Gemini Flash rate limit or quota exceeded.")
        elif code in (408, 504):
            raise LLMTimeoutError("Gemini server timed out.")
        raise LLMProviderError(f"Gemini API returned error code {code}: {msg}")
