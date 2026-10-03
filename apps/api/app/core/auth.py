"""
Who is calling? Verifies the Supabase access token the browser sends as
`Authorization: Bearer <jwt>`.

A JWT is three base64url parts: header.payload.signature. The signature is
made with Supabase's private key; we check it with the PUBLIC key from
Supabase's JWKS endpoint, so this server never holds a secret that could
mint tokens. (Legacy projects use one shared HS256 secret instead.)

Three outcomes, kept deliberately distinct:
  - no token          -> a guest        (authenticate() returns None)
  - a valid token     -> a CurrentUser
  - a token that is present but bad (forged, expired, wrong project)
                      -> AuthError / 401. Never silently treated as a guest,
                         so the UI can tell "session expired" from "guest".

`authenticate` is plain sync code so BOTH the middleware (which must return
responses, not raise HTTPException) and FastAPI dependencies can share it.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient, PyJWTError

from app.core.config import settings

log = logging.getLogger("signal.auth")

# Supabase puts this in the "aud" claim of every signed-in user's token.
AUDIENCE = "authenticated"
# Pinned allow-list. Never derive this from the token's own header.
ASYMMETRIC_ALGORITHMS = ["ES256", "RS256"]


class AuthError(Exception):
    """A token was sent but cannot be trusted."""


@dataclass(frozen=True)
class CurrentUser:
    id: str  # the "sub" claim = auth.users.id
    email: str | None = None


def _auth_url() -> str:
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


_jwks_client: PyJWKClient | None = None


def _jwks() -> PyJWKClient:
    # Built lazily so importing this module never touches the network.
    # PyJWKClient caches the key set (5 min by default) and re-fetches once
    # if a token names a key id it hasn't seen (i.e. after a key rotation).
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(f"{_auth_url()}/.well-known/jwks.json")
    return _jwks_client


def decode_token(token: str) -> dict:
    """Return the verified claims, or raise a PyJWTError subclass."""
    algorithm = jwt.get_unverified_header(token).get("alg")

    if algorithm == "HS256":  # legacy shared-secret projects
        if not settings.supabase_jwt_secret:
            raise PyJWTError("HS256 token but SUPABASE_JWT_SECRET is not set")
        key, allowed = settings.supabase_jwt_secret, ["HS256"]
    else:
        key = _jwks().get_signing_key_from_jwt(token).key
        allowed = ASYMMETRIC_ALGORITHMS

    return jwt.decode(
        token,
        key,
        algorithms=allowed,  # pinned per branch: blocks alg=none and key confusion
        audience=AUDIENCE,
        issuer=_auth_url(),  # a token from ANOTHER Supabase project must fail
        options={"require": ["exp", "sub"]},
    )


def bearer_token(request: Request) -> str | None:
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    token = token.strip()
    return token if scheme.lower() == "bearer" and token else None


def authenticate(request: Request) -> CurrentUser | None:
    token = bearer_token(request)
    if token is None:
        return None
    try:
        claims = decode_token(token)
    except PyJWTError as exc:
        log.info("rejected access token: %s", exc)  # never log the token itself
        raise AuthError("Your session is invalid or has expired. Please sign in again.") from exc
    return CurrentUser(id=claims["sub"], email=claims.get("email"))


# --- FastAPI dependencies ---------------------------------------------------
_CHALLENGE = {"WWW-Authenticate": "Bearer"}


def get_optional_user(request: Request) -> CurrentUser | None:
    try:
        return authenticate(request)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc), headers=_CHALLENGE) from exc


def require_user(user: Annotated[CurrentUser | None, Depends(get_optional_user)]) -> CurrentUser:
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in to continue.", headers=_CHALLENGE)
    return user


OptionalUser = Annotated[CurrentUser | None, Depends(get_optional_user)]
RequiredUser = Annotated[CurrentUser, Depends(require_user)]