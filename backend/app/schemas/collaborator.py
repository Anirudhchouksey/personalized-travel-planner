"""
Pydantic schemas for trip collaborators and role-based sharing permissions.
"""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

CollaboratorRole = Literal["viewer", "editor"]
EMAIL_REGEX = r"^[\w\.\+-]+@[\w\.-]+\.[a-zA-Z]{2,}$"


class CollaboratorInvite(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX, description="Email of the collaborator to invite")
    role: CollaboratorRole = Field(default="viewer", description="Permission role: 'viewer' or 'editor'")


class CollaboratorUpdate(BaseModel):
    role: CollaboratorRole = Field(..., description="Updated permission role")


class CollaboratorResponse(BaseModel):
    id: str
    trip_id: str
    email: str
    role: CollaboratorRole
    user_id: Optional[str] = None
    created_at: datetime
