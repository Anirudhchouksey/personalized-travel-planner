"""
Routes proxy for trips, delegating to the v1 trips endpoints.
"""
from app.api.v1.endpoints.trips import router, legacy_router

__all__ = ["router", "legacy_router"]
