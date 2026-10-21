import asyncio
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.services.ai.base import LLMProvider, LLMProviderError

class GroqProvider(LLMProvider):
    name: str = "groq"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        expected_root_key: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise LLMProviderError(
                "GROQ_API_KEY is not configured. Set GROQ_API_KEY in environment or .env file."
            )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
            "max_tokens": 4096
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        retries = 2
        last_error = None

        for attempt in range(retries + 1):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(self.endpoint, json=payload, headers=headers)

                    if response.status_code == 429:
                        # Rate limit handling
                        if attempt < retries:
                            await asyncio.sleep(2.0 * (attempt + 1))
                            continue
                        raise LLMProviderError("Groq rate limit exceeded (HTTP 429). Please try again shortly.")

                    if response.status_code != 200:
                        raise LLMProviderError(f"Groq API returned HTTP {response.status_code}: {response.text}")

                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    return self.extract_json(content)

            except httpx.RequestError as exc:
                last_error = exc
                if attempt < retries:
                    await asyncio.sleep(1.5)
                    continue
                raise LLMProviderError(f"Groq network request failed: {str(exc)}") from exc
            except Exception as exc:
                if isinstance(exc, LLMProviderError):
                    raise
                raise LLMProviderError(f"Groq generation error: {str(exc)}") from exc

        raise LLMProviderError(f"Groq failed after retries: {str(last_error)}")

    async def check_health(self) -> Dict[str, Any]:
        configured = bool(self.api_key and self.api_key.startswith("gsk_"))
        return {
            "provider": self.name,
            "model": self.model,
            "configured": configured,
            "status": "ready" if configured else "missing_api_key",
            "message": "Groq is configured" if configured else "Set GROQ_API_KEY in .env"
        }
