"""
Tests for app/core/auth.py: what counts as a valid session, and what must
never be trusted. No network: the JWKS client is replaced with a local key.
"""
import base64
import json
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.core import auth
from app.core.config import settings
from tests.conftest import TEST_USER_ID


def request_with(token: str | None = None, scheme: str = "Bearer") -> Request:
    headers = [(b"authorization", f"{scheme} {token}".encode())] if token else []
    return Request({"type": "http", "headers": headers})


@pytest.fixture
def ec_key(monkeypatch):
    """An ES256 key pair, with the JWKS lookup pointed at its public half."""
    private = ec.generate_private_key(ec.SECP256R1())
    private_pem = private.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public = private.public_key()
    stub = SimpleNamespace(get_signing_key_from_jwt=lambda token: SimpleNamespace(key=public))
    monkeypatch.setattr(auth, "_jwks", lambda: stub)
    return private_pem, public


# --- valid sessions -----------------------------------------------------------
def test_valid_hs256_token_yields_the_user(make_token):
    user = auth.authenticate(request_with(make_token()))
    assert user == auth.CurrentUser(id=TEST_USER_ID, email="dev@example.com")


def test_valid_es256_token_is_verified_against_the_public_key(make_token, ec_key):
    private_pem, _ = ec_key
    token = make_token(secret=private_pem, algorithm="ES256", headers={"kid": "k1"})
    assert auth.authenticate(request_with(token)).id == TEST_USER_ID


def test_no_authorization_header_means_guest():
    assert auth.authenticate(request_with(None)) is None


def test_scheme_is_case_insensitive(make_token):
    assert auth.authenticate(request_with(make_token(), scheme="bearer")) is not None


def test_a_non_bearer_scheme_is_treated_as_no_token(make_token):
    assert auth.authenticate(request_with(make_token(), scheme="Basic")) is None


# --- tokens that must be refused ---------------------------------------------------
def test_expired_token_is_refused(make_token):
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(make_token(expires_in=-5)))


def test_token_signed_with_the_wrong_secret_is_refused(make_token):
    forged = make_token(secret="attacker-secret-attacker-secret-0000")
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(forged))


def test_token_for_another_audience_is_refused(make_token):
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(make_token(aud="service")))


def test_token_from_another_supabase_project_is_refused(make_token):
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(make_token(iss="https://other.supabase.co/auth/v1")))


def test_token_without_a_subject_is_refused(make_token):
    token = make_token(sub=None)  # becomes null; build one with the claim removed instead
    payload = jwt.decode(token, options={"verify_signature": False})
    del payload["sub"]
    stripped = jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(stripped))


@pytest.mark.parametrize("garbage", ["not-a-jwt", "a.b.c", "....", "Ünïcödé"])
def test_garbage_is_refused_not_crashed(garbage):
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(garbage))


def test_alg_none_is_refused(ec_key):
    def b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()

    unsigned = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': TEST_USER_ID, 'aud': 'authenticated'})}."
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(unsigned))


def test_hs256_token_signed_with_the_public_key_is_refused(ec_key):
    """
    Classic algorithm-confusion attack: claim HS256, then HMAC-sign using the
    PUBLIC key (which anyone can download) as the secret. PyJWT refuses to
    build such a token, so the attacker's token is assembled by hand.
    """
    import hashlib
    import hmac
    import time

    _, public = ec_key
    public_pem = public.public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )

    def b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({
        "sub": TEST_USER_ID, "aud": "authenticated",
        "iss": f"{settings.supabase_url}/auth/v1", "exp": int(time.time()) + 3600,
    }).encode())
    signature = b64(hmac.new(public_pem, f"{header}.{payload}".encode(), hashlib.sha256).digest())

    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(f"{header}.{payload}.{signature}"))


def test_hs256_is_refused_when_no_shared_secret_is_configured(make_token, monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "")
    with pytest.raises(auth.AuthError):
        auth.authenticate(request_with(make_token()))


# --- the FastAPI dependencies ----------------------------------------------------------
@pytest.fixture
def api():
    from app.routes import me

    app = FastAPI()
    app.include_router(me.router, prefix="/api")

    @app.get("/who")
    def who(user: auth.OptionalUser):
        return {"user": user.id if user else None}

    return TestClient(app)


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_me_returns_the_caller(api, make_token):
    res = api.get("/api/me", headers=bearer(make_token()))
    assert res.status_code == 200
    assert res.json() == {"id": TEST_USER_ID, "email": "dev@example.com"}


def test_me_requires_sign_in(api):
    res = api.get("/api/me")
    assert res.status_code == 401
    assert res.headers["www-authenticate"] == "Bearer"


def test_optional_user_lets_guests_through(api):
    assert api.get("/who").json() == {"user": None}


def test_optional_user_recognises_a_signed_in_caller(api, make_token):
    assert api.get("/who", headers=bearer(make_token())).json() == {"user": TEST_USER_ID}


def test_optional_user_still_rejects_a_bad_token(api, make_token):
    res = api.get("/who", headers=bearer(make_token(expires_in=-5)))
    assert res.status_code == 401