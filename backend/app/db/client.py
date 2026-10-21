from typing import Optional
from supabase import Client, create_client
from app.core.config import settings

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Returns singleton Supabase client if configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if settings.is_supabase_configured():
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, key)
            return _supabase_client
        except Exception as e:
            print(f"[Supabase] Warning: Failed to initialize Supabase client: {e}")
            return None
    return None
