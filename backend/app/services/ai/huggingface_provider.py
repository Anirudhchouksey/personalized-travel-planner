from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.services.ai.base import LLMProvider, LLMProviderError

class HuggingFaceProvider(LLMProvider):
    name: str = "huggingface"

    def __init__(self, api_token: Optional[str] = None, model: Optional[str] = None):
        self.api_token = api_token or settings.HUGGINGFACE_API_TOKEN
        self.model = model or settings.HUGGINGFACE_MODEL or "meta-llama/Llama-3.1-70B-Instruct"
        # HF standard v1 router endpoint
        self.endpoint = f"https://api-inference.huggingface.co/models/{self.model}/v1/chat/completions"

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        expected_root_key: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.api_token:
            raise LLMProviderError(
                "HUGGINGFACE_API_TOKEN is not configured. Set HUGGINGFACE_API_TOKEN in .env"
            )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": f"{prompt}\nIMPORTANT: Respond ONLY with valid JSON. Do not include introductory text or explanations outside JSON."
        })

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 4096,
            "temperature": 0.3
        }

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(self.endpoint, json=payload, headers=headers)
                if response.status_code == 503:
                    # Model is loading
                    raise LLMProviderError("Hugging Face model is currently loading on serverless cold start. Please retry in 20 seconds.")
                if response.status_code != 200:
                    raise LLMProviderError(f"Hugging Face returned HTTP {response.status_code}: {response.text}")

                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0]["message"]["content"]
                    return self.extract_json(content)
                elif isinstance(data, list) and len(data) > 0 and "generated_text" in data[0]:
                    return self.extract_json(data[0]["generated_text"])
                else:
                    raise LLMProviderError(f"Unexpected Hugging Face response format: {data}")

        except httpx.RequestError as exc:
            raise LLMProviderError(f"Hugging Face request failed: {str(exc)}") from exc

    async def check_health(self) -> Dict[str, Any]:
        configured = bool(self.api_token)
        return {
            "provider": self.name,
            "model": self.model,
            "configured": configured,
            "status": "ready" if configured else "missing_api_token",
            "message": "Hugging Face configured" if configured else "Set HUGGINGFACE_API_TOKEN in .env"
        }
