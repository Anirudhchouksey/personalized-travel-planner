"""
Centralized Supabase Database Connection Layer.
Provides client factory functions with strict separation between
the public/anon client and the privileged server-side service-role client.
"""
from typing import Optional
import logging
from supabase import Client, create_client
from app.core.config import settings

logger = logging.getLogger("app.core.database")

_anon_client: Optional[Client] = None
_service_client: Optional[Client] = None


def get_client() -> Optional[Client]:
    """
    Returns the normal Supabase client using SUPABASE_ANON_KEY (or SUPABASE_KEY).
    Operations through this client respect PostgreSQL Row Level Security (RLS) policies
    for the current session or public access.
    """
    global _anon_client
    if _anon_client is not None:
        return _anon_client

    if not settings.SUPABASE_URL:
        return None

    key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY
    if not key:
        return None

    try:
        _anon_client = create_client(settings.SUPABASE_URL, key)
        logger.info("[Database] Initialized public Supabase client.")
        return _anon_client
    except Exception as e:
        logger.warning(f"[Database] Failed to initialize public Supabase client: {e}")
        return None


def get_service_client() -> Optional[Client]:
    """
    Returns a privileged server-side Supabase client using SUPABASE_SERVICE_ROLE_KEY.
    SECURITY NOTICE:
    - Never expose this client to the frontend or browser.
    - Always verify user authorization and resource ownership in the backend
      before invoking operations with this client.
    """
    global _service_client
    if _service_client is not None:
        return _service_client

    if not settings.SUPABASE_URL:
        return None

    service_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.effective_supabase_key
    if not service_key:
        return None

    try:
        _service_client = create_client(settings.SUPABASE_URL, service_key)
        logger.info("[Database] Initialized privileged service-role Supabase client.")
        return _service_client
    except Exception as e:
        logger.warning(f"[Database] Failed to initialize service-role Supabase client: {e}")
        return None


def is_database_connected() -> bool:
    """Checks whether either Supabase client is configured and available."""
    client = get_service_client() or get_client()
    return client is not None


def reset_database_clients() -> None:
    """Helper for test suites to reset client singletons."""
    global _anon_client, _service_client
    _anon_client = None
    _service_client = None
