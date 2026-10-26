from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error type identifier")
    detail: str = Field(..., description="Human-readable error details")
    error_code: Optional[str] = Field(None, description="Standard machine error code")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp"
    )
