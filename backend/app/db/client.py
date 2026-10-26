"""
Database client bridge.
Re-exports centralized client access functions from app.core.database.
"""
from typing import Optional
from supabase import Client
from app.core.database import get_client, get_service_client, is_database_connected, reset_database_clients


def get_supabase_client() -> Optional[Client]:
    """Compatibility alias returning the active server-side client."""
    return get_service_client() or get_client()


__all__ = [
    "get_client",
    "get_service_client",
    "get_supabase_client",
    "is_database_connected",
    "reset_database_clients",
]
