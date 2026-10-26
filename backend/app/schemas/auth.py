import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = r"^[\w\.\+-]+@[\w\.-]+\.[a-zA-Z]{2,}$"

class UserRegisterRequest(BaseModel):
    email: str = Field(
        ...,
        pattern=EMAIL_REGEX,
        description="Valid user email address",
        json_schema_extra={"example": "traveler@example.com"}
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password must be at least 8 characters long",
        json_schema_extra={"example": "SuperSecret123!"}
    )
    display_name: Optional[str] = Field(
        None,
        min_length=2,
        max_length=80,
        description="User's preferred display or full name",
        json_schema_extra={"example": "Alex Rivers"}
    )
    preferred_currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="ISO 4217 3-letter currency code",
        json_schema_extra={"example": "USD"}
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v.strip()) < 8:
            raise ValueError("Password must contain at least 8 non-whitespace characters")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one numeric digit")
        return v

class UserLoginRequest(BaseModel):
    email: str = Field(
        ...,
        pattern=EMAIL_REGEX,
        description="Registered email address",
        json_schema_extra={"example": "traveler@example.com"}
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password",
        json_schema_extra={"example": "SuperSecret123!"}
    )

class UserProfileResponse(BaseModel):
    id: str = Field(..., description="Unique user UUID")
    email: str = Field(..., description="User's email address")
    display_name: str = Field(..., description="Display name")
    preferred_currency: str = Field(default="USD", description="Default currency code")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Registration timestamp")

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token authentication scheme")
    expires_in: int = Field(default=86400, description="Token lifetime in seconds (24 hours)")
    user: UserProfileResponse = Field(..., description="Authenticated user profile context")

    model_config = ConfigDict(from_attributes=True)
