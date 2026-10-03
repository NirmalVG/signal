import time

import jwt
import pytest

from app.core.config import settings

TEST_SECRET = "test-secret-test-secret-test-secret-1234"
TEST_SUPABASE_URL = "https://test.supabase.co"
TEST_USER_ID = "11111111-1111-1111-1111-111111111111"


@pytest.fixture(autouse=True)
def auth_settings(monkeypatch):
    """Deterministic auth config, whatever the developer's real .env says."""
    monkeypatch.setattr(settings, "supabase_url", TEST_SUPABASE_URL)
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)


@pytest.fixture
def make_token():
    """Build a Supabase-shaped access token. Extra kwargs override/add claims."""

    def _make(*, secret=TEST_SECRET, algorithm="HS256", expires_in=3600, headers=None, **claims):
        now = int(time.time())
        payload = {
            "sub": TEST_USER_ID,
            "email": "dev@example.com",
            "aud": "authenticated",
            "iss": f"{TEST_SUPABASE_URL}/auth/v1",
            "iat": now,
            "exp": now + expires_in,
            **claims,
        }
        return jwt.encode(payload, secret, algorithm=algorithm, headers=headers)

    return _make