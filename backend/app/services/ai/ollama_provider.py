from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.services.ai.base import LLMProvider, LLMProviderError

class OllamaProvider(LLMProvider):
    name: str = "ollama"

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL or "llama3.2"

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        expected_root_key: Optional[str] = None
    ) -> Dict[str, Any]:
        endpoint = f"{self.base_url}/api/chat"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.4
            }
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(endpoint, json=payload)
                if response.status_code != 200:
                    raise LLMProviderError(f"Ollama returned HTTP {response.status_code}: {response.text}")
                data = response.json()
                content = data.get("message", {}).get("content", "")
                return self.extract_json(content)
        except httpx.ConnectError:
            raise LLMProviderError(
                f"Cannot connect to Ollama at {self.base_url}. Ensure 'ollama serve' is running locally."
            )
        except httpx.RequestError as exc:
            raise LLMProviderError(f"Ollama request error: {str(exc)}") from exc

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                running = res.status_code == 200
                models = [m.get("name") for m in res.json().get("models", [])] if running else []
                return {
                    "provider": self.name,
                    "model": self.model,
                    "configured": True,
                    "status": "ready" if running else "unreachable",
                    "installed_models": models,
                    "message": "Ollama is running" if running else f"Ollama not running at {self.base_url}"
                }
        except Exception:
            return {
                "provider": self.name,
                "model": self.model,
                "configured": True,
                "status": "unreachable",
                "message": f"Ollama not running at {self.base_url}"
            }
