"""
Centralized exception hierarchy for the Travel Planner AI and API layer.
"""
from typing import Any, Dict, Optional

class AppException(Exception):
    """Base application exception."""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

class LLMProviderError(AppException):
    """Base error for LLM provider failures."""
    def __init__(self, message: str, status_code: int = 502, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status_code, details=details)

class LLMAuthenticationError(LLMProviderError):
    """Raised when LLM credentials or API keys are invalid or missing."""
    def __init__(self, message: str = "Invalid or missing LLM API credentials."):
        super().__init__(message=message, status_code=502)

class LLMQuotaExceededError(LLMProviderError):
    """Raised when LLM API rate limits or quota are exceeded."""
    def __init__(self, message: str = "LLM provider rate limit or quota exceeded."):
        super().__init__(message=message, status_code=429)

class LLMTimeoutError(LLMProviderError):
    """Raised when an LLM call exceeds timeout limits."""
    def __init__(self, message: str = "LLM provider request timed out."):
        super().__init__(message=message, status_code=504)

class LLMResponseMalformedError(LLMProviderError):
    """Raised when LLM fails to return valid or repairable structured JSON."""
    def __init__(self, message: str = "LLM provider returned malformed response."):
        super().__init__(message=message, status_code=502)

class ItineraryGenerationError(AppException):
    """Raised when itinerary generation fails validation or processing."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, details=details)

class SchedulingConflictError(ItineraryGenerationError):
    """Raised when activity timings in an itinerary conflict or overlap excessively."""
    def __init__(self, message: str = "Detected overlapping activities in daily schedule."):
        super().__init__(message=message)

class EntityNotFoundError(AppException):
    """Raised when a requested resource (trip, itinerary, activity) does not exist."""
    def __init__(self, entity_name: str, entity_id: str):
        super().__init__(message=f"{entity_name} with id '{entity_id}' not found.", status_code=404)

class AuthorizationError(AppException):
    """Raised when a user attempts to access a resource they do not own."""
    def __init__(self, message: str = "Access denied: you do not own this resource."):
        super().__init__(message=message, status_code=403)

class ValidationError(AppException):
    """Raised when input parameters or business constraints are invalid."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, details=details)

class DatabaseError(AppException):
    """Raised when a database query, connection, or transaction fails."""
    def __init__(self, message: str = "A database operation failed.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=500, details=details)

