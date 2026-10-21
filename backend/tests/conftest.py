import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import AuthenticatedUser, get_current_user

TEST_USER = AuthenticatedUser(
    user_id="test-user-uuid-12345",
    email="tester@example.com",
    display_name="Test Traveler"
)

async def override_get_current_user() -> AuthenticatedUser:
    return TEST_USER

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
