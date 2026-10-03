"""Registration, login and access tokens.

Passwords are never stored: we keep a salted PBKDF2 hash. Access tokens are
short-lived and signed ("<payload>.<signature>"); they are verified on every
request, so there is no server-side session to look up.
"""
import base64
import hashlib
import hmac
import json
import os
import sqlite3
import time

from .config import settings
from .db import connect


class AuthError(Exception):
    """Raised when credentials or a token cannot be trusted."""


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt, settings.password_iterations
    )
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$")
    candidate = hash_password(password, bytes.fromhex(salt_hex)).split("$")[1]
    # Constant-time comparison, so response timing leaks nothing about the hash.
    return hmac.compare_digest(candidate, digest_hex)


def register(email: str, password: str) -> int:
    if len(password) < 10:
        raise AuthError("Password must be at least 10 characters")
    with connect() as conn:
        try:
            cursor = conn.execute(
                "insert into users (email, password_hash) values (?, ?)",
                (email.lower(), hash_password(password)),
            )
        except sqlite3.IntegrityError as exc:
            raise AuthError("That email is already registered") from exc
        return cursor.lastrowid


def login(email: str, password: str) -> str:
    with connect() as conn:
        row = conn.execute(
            "select id, password_hash from users where email = ?", (email.lower(),)
        ).fetchone()
    # One message for "no such user" and "wrong password": never reveal which
    # email addresses have accounts.
    if row is None or not verify_password(password, row["password_hash"]):
        raise AuthError("Invalid email or password")
    return issue_token(row["id"])


def _sign(payload: bytes) -> str:
    return hmac.new(settings.secret_key.encode(), payload, hashlib.sha256).hexdigest()


def issue_token(user_id: int) -> str:
    expires_at = int(time.time()) + settings.access_token_minutes * 60
    claims = json.dumps({"sub": user_id, "exp": expires_at}).encode()
    payload = base64.urlsafe_b64encode(claims)
    return f"{payload.decode()}.{_sign(payload)}"


def verify_token(token: str) -> int:
    try:
        payload_b64, signature = token.split(".")
    except ValueError as exc:
        raise AuthError("Malformed token") from exc

    payload = payload_b64.encode()
    if not hmac.compare_digest(signature, _sign(payload)):
        raise AuthError("Bad signature")

    claims = json.loads(base64.urlsafe_b64decode(payload))
    if claims["exp"] < time.time():
        raise AuthError("Token expired")
    return claims["sub"]


def user_id_from_header(authorization: str | None) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthError("Missing bearer token")
    return verify_token(authorization.removeprefix("Bearer "))
