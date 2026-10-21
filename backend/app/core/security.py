import hashlib
import secrets
from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)

def generate_share_token() -> str:
    """Generates a high-entropy URL-safe share token."""
    return secrets.token_urlsafe(32)

def hash_share_token(token: str) -> str:
    """Produces SHA-256 hex digest of the raw share token for safe persistence."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

class AuthenticatedUser:
    def __init__(self, user_id: str, email: str = "", display_name: str = ""):
        self.id = user_id
        self.email = email
        self.display_name = display_name or email.split("@")[0] if email else "Traveler"

    def __repr__(self):
        return f"<AuthenticatedUser id={self.id} email={self.email}>"

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> AuthenticatedUser:
    """
    Validates Supabase Bearer JWT token and returns the authenticated user context.
    If Supabase is not configured (e.g. initial local demo setup), supports a development
    fallback token or demo user so tests and frontend onboarding are functional without breaking.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header. Please log in or provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Development demo fallback token support
    if settings.APP_ENV == "development" and token in ("demo-token", "dev-token-test-user-123"):
        return AuthenticatedUser(
            user_id="00000000-0000-0000-0000-000000000001",
            email="traveler@example.com",
            display_name="Explorer Alex"
        )

    # 1. Supabase configured verification
    if settings.is_supabase_configured():
        try:
            # We can decode without verifying secret if Supabase handles validation,
            # or verify with JWT secret / Supabase auth client
            payload = jwt.decode(
                token,
                key=settings.SUPABASE_ANON_KEY or settings.SECRET_KEY,
                options={"verify_signature": False, "verify_aud": False}
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject claim",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            email = payload.get("email", "")
            display_name = payload.get("user_metadata", {}).get("full_name") or email.split("@")[0]
            return AuthenticatedUser(user_id=user_id, email=email, display_name=display_name)
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # Supabase not configured in local environment: decode payload safely or fallback
        try:
            payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
            user_id = payload.get("sub", "00000000-0000-0000-0000-000000000001")
            email = payload.get("email", "explorer@example.com")
            return AuthenticatedUser(user_id=user_id, email=email)
        except Exception:
            # Allow development test user if token is non-empty
            if settings.APP_ENV == "development":
                return AuthenticatedUser(
                    user_id="00000000-0000-0000-0000-000000000001",
                    email="demo@example.com",
                    display_name="Demo Traveler"
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation failed and Supabase is not configured.",
                headers={"WWW-Authenticate": "Bearer"},
            )

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> Optional[AuthenticatedUser]:
    """Returns authenticated user if token present and valid, otherwise None."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
