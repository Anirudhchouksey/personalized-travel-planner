"""
Tests verifying secure environment configuration, secret isolation,
and Google Gemini Flash integration settings.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings, settings
from app.ai.providers.gemini_provider import GeminiProvider
from app.core.exceptions import LLMAuthenticationError

client = TestClient(app)

def test_environment_settings_load_correctly():
    """Verify settings load strongly-typed properties from environment."""
    assert settings.APP_NAME is not None
    assert settings.ENVIRONMENT in ("development", "testing", "staging", "production")
    assert isinstance(settings.DEBUG, bool)
    assert settings.GEMINI_MODEL in ("gemini-2.5-flash", "gemini-1.5-flash")
    assert settings.API_PORT == 8000
    assert "http://localhost:5173" in settings.cors_origin_list

def test_missing_gemini_api_key_produces_clear_error():
    """Verify missing GEMINI_API_KEY produces clear, actionable error without crashing."""
    provider = GeminiProvider(api_key="")
    with pytest.raises(LLMAuthenticationError) as exc_info:
        provider._ensure_client()
    assert "GEMINI_API_KEY" in str(exc_info.value)
    assert "https://aistudio.google.com/apikey" in str(exc_info.value)

def test_secrets_never_returned_in_api_responses():
    """Verify secret credentials (GEMINI_API_KEY, SERVICE_ROLE_KEY, SECRET_KEY) are absent from API responses."""
    # 1. Root and health endpoints
    res_health = client.get("/health")
    assert res_health.status_code == 200
    body_text = res_health.text
    if settings.SECRET_KEY:
        assert settings.SECRET_KEY not in body_text
    if settings.GEMINI_API_KEY:
        assert settings.GEMINI_API_KEY not in body_text
    if settings.SUPABASE_SERVICE_ROLE_KEY:
        assert settings.SUPABASE_SERVICE_ROLE_KEY not in body_text

    # 2. Readiness endpoint
    res_ready = client.get("/ready")
    assert res_ready.status_code == 200
    ready_text = res_ready.text
    if settings.SECRET_KEY:
        assert settings.SECRET_KEY not in ready_text
    if settings.GEMINI_API_KEY:
        assert settings.GEMINI_API_KEY not in ready_text
    if settings.SUPABASE_SERVICE_ROLE_KEY:
        assert settings.SUPABASE_SERVICE_ROLE_KEY not in ready_text

def test_settings_representation_masks_secrets():
    """Verify repr(settings) and get_safe_summary() never expose raw secret keys in logs."""
    safe_dict = settings.get_safe_summary()
    assert "SECRET_KEY" not in safe_dict
    assert "GEMINI_API_KEY" not in safe_dict
    assert "SUPABASE_SERVICE_ROLE_KEY" not in safe_dict

    repr_str = repr(settings)
    if settings.SECRET_KEY and len(settings.SECRET_KEY) > 10:
        assert settings.SECRET_KEY not in repr_str

def test_gemini_model_configuration_from_env():
    """Verify GeminiProvider respects custom model setting."""
    custom_provider = GeminiProvider(api_key="dummy-test-key", model="gemini-1.5-flash")
    assert custom_provider.model == "gemini-1.5-flash"
    assert custom_provider.api_key == "dummy-test-key"

def test_cors_origin_list_resolution():
    """Verify CORS origins string is cleanly parsed into a List of allowed domains."""
    custom_settings = Settings(
        CORS_ORIGINS="https://app.wanderai.com, https://preview.wanderai.com ,http://localhost:3000"
    )
    origins = custom_settings.cors_origin_list
    assert len(origins) == 3
    assert "https://app.wanderai.com" in origins
    assert "https://preview.wanderai.com" in origins
    assert "http://localhost:3000" in origins

def test_cors_preflight_headers():
    """Verify CORS middleware responds with Access-Control-Allow-Origin header."""
    res = client.options(
        "/api/v1/trips",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert res.status_code in (200, 204)
    assert res.headers.get("access-control-allow-origin") in ("http://localhost:5173", "*")

def test_production_environment_forces_debug_false():
    """Verify that in production mode, DEBUG is forced to False for security."""
    prod_settings = Settings(
        ENVIRONMENT="production",
        DEBUG=True
    )
    assert prod_settings.DEBUG is False
