"""Routes proxy delegating to v1 routes endpoints."""
from app.api.v1.endpoints.routes import router

__all__ = ["router"]
