import os
from typing import Any, Dict, List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator

class Settings(BaseSettings):
    """
    Centralized, strongly typed application settings managed via Pydantic Settings.
    Reads from environment variables and backend/.env without exposing secrets.
    """
    APP_NAME: str = Field(default="AI Travel Planner", description="Application display name")
    ENVIRONMENT: str = Field(default="development", description="development | testing | staging | production")
    APP_ENV: Optional[str] = Field(default=None, description="Legacy alias for ENVIRONMENT")
    DEBUG: bool = Field(default=False, description="Enable debug mode (disallowed in production)")

    # Authentication & Security
    SECRET_KEY: str = Field(default="", description="Cryptographically secure secret key for token signing")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1, description="JWT session expiration time in minutes")

    # Gemini Flash AI Provider (official google-genai SDK)
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key from https://aistudio.google.com/apikey")
    GEMINI_MODEL: str = Field(default="gemini-3.5-flash", description="Configurable Gemini model identifier")

    # AI Provider selector: gemini | mock
    AI_PROVIDER: str = Field(default="gemini", description="Active AI provider: gemini or mock")
    LLM_PROVIDER: Optional[str] = Field(default=None, description="Legacy alias for AI_PROVIDER")

    # Supabase PostgreSQL Configuration
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase public anonymous key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", description="Backend-only Supabase service role key")
    SUPABASE_KEY: Optional[str] = Field(default=None, description="Legacy alias for SUPABASE_ANON_KEY")

    # Networking & CORS
    FRONTEND_URL: str = Field(default="http://localhost:5173", description="Frontend application URL")
    BACKEND_URL: str = Field(default="http://localhost:8000", description="Backend API base URL")
    CORS_ORIGINS: str = Field(default="http://localhost:5173", description="Comma-separated allowed CORS origins")
    API_HOST: str = Field(default="127.0.0.1", description="Binding host for API server")
    API_PORT: int = Field(default=8000, description="Binding port for API server")
    PORT: Optional[int] = Field(default=None, description="Legacy alias for API_PORT")

    # Optional Local Providers (Fallback & Offline Exploration)
    GROQ_API_KEY: str = Field(default="", description="Optional Groq API key")
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile", description="Optional Groq model")
    HUGGINGFACE_API_TOKEN: str = Field(default="", description="Optional HuggingFace token")
    HUGGINGFACE_MODEL: str = Field(default="meta-llama/Llama-3.1-70B-Instruct", description="Optional HuggingFace model")
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", description="Optional Ollama base URL")
    OLLAMA_MODEL: str = Field(default="llama3.2", description="Optional Ollama model")
    ROUTING_PROVIDER: str = Field(default="none", description="Routing service: none | osrm")
    ROUTING_API_KEY: str = Field(default="", description="Optional routing service key")

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

    @field_validator("SUPABASE_URL", mode="before")
    @classmethod
    def clean_supabase_url(cls, v: Any) -> str:
        if isinstance(v, str):
            v = v.strip()
            if v.endswith("/rest/v1/") or v.endswith("/rest/v1"):
                v = v.split("/rest/v1")[0]
            return v.rstrip("/")
        return ""

    @model_validator(mode="after")
    def harmonize_and_validate(self):
        # Sync legacy aliases
        if self.APP_ENV and not os.environ.get("ENVIRONMENT"):
            self.ENVIRONMENT = self.APP_ENV
        else:
            self.APP_ENV = self.ENVIRONMENT

        if self.PORT and not os.environ.get("API_PORT"):
            self.API_PORT = self.PORT
        else:
            self.PORT = self.API_PORT

        if self.LLM_PROVIDER and not os.environ.get("AI_PROVIDER"):
            self.AI_PROVIDER = self.LLM_PROVIDER
        else:
            self.LLM_PROVIDER = self.AI_PROVIDER

        if self.SUPABASE_KEY and not self.SUPABASE_ANON_KEY:
            self.SUPABASE_ANON_KEY = self.SUPABASE_KEY

        # Production safety checks
        if self.ENVIRONMENT.lower() == "production":
            if self.DEBUG:
                # Force DEBUG to False in production
                self.DEBUG = False

        return self

    @property
    def cors_origin_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return [self.FRONTEND_URL] if self.FRONTEND_URL else ["http://localhost:5173"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def is_supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and (self.SUPABASE_ANON_KEY or self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_KEY))

    @property
    def effective_supabase_key(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_ANON_KEY or self.SUPABASE_KEY or ""

    @property
    def effective_llm_provider(self) -> str:
        prov = (self.AI_PROVIDER or self.LLM_PROVIDER or "mock").lower().strip()
        return prov

    def get_safe_summary(self) -> Dict[str, Any]:
        """Returns non-sensitive configuration summary safe for telemetry and logging."""
        return {
            "app_name": self.APP_NAME,
            "environment": self.ENVIRONMENT,
            "debug": self.DEBUG,
            "gemini_model": self.GEMINI_MODEL,
            "gemini_key_set": bool(self.GEMINI_API_KEY),
            "ai_provider": self.effective_llm_provider,
            "supabase_configured": self.is_supabase_configured(),
            "frontend_url": self.FRONTEND_URL,
            "cors_origins": self.cors_origin_list,
            "api_host": self.API_HOST,
            "api_port": self.API_PORT,
        }

    def __repr__(self) -> str:
        safe = self.get_safe_summary()
        return f"<Settings {safe}>"

settings = Settings()
