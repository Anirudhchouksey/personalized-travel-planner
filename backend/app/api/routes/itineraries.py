"""
Routes proxy for itineraries, delegating to the v1 itineraries endpoints.
"""
from app.api.v1.endpoints.itineraries import router

__all__ = ["router"]
