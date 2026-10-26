from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.services.ai.factory import get_all_providers_health
from app.db.client import get_supabase_client
import time

router = APIRouter(tags=["Health"])

START_TIME = time.time()

@router.get("/health")
@router.get("/healthz")
@router.get("/live")
async def health_check():
    """Liveness probe indicating the application process is running."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "active_ai_provider": settings.AI_PROVIDER,
        "supabase_configured": settings.is_supabase_configured(),
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }

@router.get("/ready")
@router.get("/api/v1/ready")
async def readiness_check(response: Response):
    """
    Readiness probe verifying database connectivity, AI provider readiness,
    and system availability before traffic is routed.
    """
    db_status = "unconfigured_fallback_memory"
    db_healthy = True

    if settings.is_supabase_configured():
        try:
            client = get_supabase_client()
            if client:
                # Lightweight ping
                res = client.table("trips").select("id").limit(1).execute()
                db_status = "connected"
            else:
                db_status = "client_init_failed"
                db_healthy = False
        except Exception as e:
            # If network error or temporary disruption
            db_status = f"error: {str(e)[:80]}"
            # Note: app still runs in fallback memory mode if db unavailable
            db_healthy = True

    providers_status = await get_all_providers_health()
    overall_ready = db_healthy

    if not overall_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if overall_ready else "not_ready",
        "database": {
            "status": db_status,
            "configured": settings.is_supabase_configured(),
            "healthy": db_healthy,
        },
        "ai_providers": providers_status,
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }

@router.get("/api/v1/health/ai")
async def ai_health_check():
    """Detailed health check of LLM providers (Gemini Flash, Mock, etc.)."""
    return await get_all_providers_health()
