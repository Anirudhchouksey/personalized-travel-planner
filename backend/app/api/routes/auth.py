import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from app.core.config import settings
from app.core.security import AuthenticatedUser, get_current_user
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# Local demo users memory cache for offline/free operation without external auth servers
_mock_users_db = {
    "traveler@example.com": {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "traveler@example.com",
        "password": "Password123!",
        "display_name": "Demo Explorer",
        "preferred_currency": "USD",
        "created_at": datetime.utcnow(),
    }
}

def create_jwt_token(user_id: str, email: str, display_name: str) -> str:
    """Creates a signed JWT access token."""
    expire = datetime.utcnow() + timedelta(days=1)
    to_encode = {
        "sub": user_id,
        "email": email,
        "user_metadata": {"full_name": display_name},
        "exp": expire,
    }
    secret = settings.SECRET_KEY or "wanderai-free-secret-jwt-key"
    return jwt.encode(to_encode, secret, algorithm="HS256")

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest):
    """
    Registers a new user, enforcing email format, password complexity, and profile defaults.
    Returns a signed JWT bearer token and user profile context.
    """
    email_key = payload.email.lower().strip()
    if email_key in _mock_users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{payload.email}' already exists."
        )

    user_id = str(uuid.uuid4())
    display_name = payload.display_name or payload.email.split("@")[0]
    now = datetime.utcnow()

    user_record = {
        "id": user_id,
        "email": email_key,
        "password": payload.password,
        "display_name": display_name,
        "preferred_currency": payload.preferred_currency,
        "created_at": now,
    }
    _mock_users_db[email_key] = user_record

    token = create_jwt_token(user_id, email_key, display_name)
    user_profile = UserProfileResponse(
        id=user_id,
        email=email_key,
        display_name=display_name,
        preferred_currency=payload.preferred_currency,
        created_at=now,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        user=user_profile,
    )

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest):
    """
    Authenticates user credentials and returns a secure JWT bearer access token.
    """
    email_key = payload.email.lower().strip()
    user = _mock_users_db.get(email_key)

    if not user or user["password"] != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_jwt_token(user["id"], user["email"], user["display_name"])
    user_profile = UserProfileResponse(
        id=user["id"],
        email=user["email"],
        display_name=user["display_name"],
        preferred_currency=user["preferred_currency"],
        created_at=user["created_at"],
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        user=user_profile,
    )

@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Returns the authenticated user's profile context."""
    user = _mock_users_db.get(current_user.email)
    if user:
        return UserProfileResponse(
            id=user["id"],
            email=user["email"],
            display_name=user["display_name"],
            preferred_currency=user["preferred_currency"],
            created_at=user["created_at"],
        )

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        preferred_currency="USD",
        created_at=datetime.utcnow(),
    )
