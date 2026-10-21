from fastapi import APIRouter
from app.core.config import settings
from app.services.ai.factory import get_all_providers_health

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """System liveness and readiness probe for Render and load balancers."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "active_ai_provider": settings.AI_PROVIDER,
        "supabase_configured": settings.is_supabase_configured()
    }

@router.get("/api/v1/health/ai")
async def ai_health_check():
    """Detailed health check of LLM providers (Groq, Hugging Face, Ollama, Mock)."""
    return await get_all_providers_health()
