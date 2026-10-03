"""
Abuse protection for a public, unauthenticated API.

Why this exists: /api/query and /api/ingest spend real money (LLM and embedding
credits) and /api/repos DELETE destroys data. With no login, anyone who finds
the URL could drain credits or wipe the demo repository.

Three layers, all enforced in ONE middleware:
  1. Read-only mode  - refuse uploads and deletions entirely (public demo).
  2. Per-IP limits   - sliding window: stops one visitor hammering the API.
  3. Daily caps      - whole-instance ceiling: bounds the bill even if the
                       traffic comes from thousands of different IPs.

Why a middleware and not a FastAPI dependency: FastAPI parses a multipart
upload BEFORE running dependencies, so a dependency can only reject a 200 MB
upload after receiving all of it. A middleware answers from the headers alone.
(Verified with a spy on Starlette's multipart parser; see tests.)

Limits live in process memory. That is correct for one server process and
resets on restart. Several workers or servers need a shared store such as Redis.
"""
from __future__ import annotations

import math
import re
import threading
import time
from collections import deque
from datetime import date, datetime, timedelta, timezone
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.auth import AuthError, authenticate
from app.core.config import settings

# Keep in sync with MAX_UPLOAD_BYTES in routes/ingest.py (200 MB), plus 1 MB of
# multipart framing. The route enforces the exact limit while streaming; this
# only lets us refuse an obviously oversized request without reading it.
MAX_REQUEST_BYTES = 201 * 1024 * 1024


class SlidingWindowLimiter:
    """Allow at most `limit` hits per `window_s` seconds for each key."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._windows: dict[str, float] = {}
        self._lock = threading.Lock()  # sync endpoints run in a thread pool
        self._last_sweep = clock()

    def check(self, key: str, limit: int, window_s: float) -> float | None:
        """
        Record a hit. Returns None when allowed, otherwise the number of
        seconds until the oldest hit leaves the window (the Retry-After value).
        Rejected requests are NOT recorded, so retrying never extends a ban.
        """
        now = self._clock()
        with self._lock:
            self._sweep(now)
            hits = self._hits.setdefault(key, deque())
            self._windows[key] = window_s
            while hits and hits[0] <= now - window_s:
                hits.popleft()
            if len(hits) >= limit:
                return hits[0] + window_s - now
            hits.append(now)
            return None

    def _sweep(self, now: float) -> None:
        # Without this, every distinct IP ever seen would stay in memory forever.
        if now - self._last_sweep < 300:
            return
        self._last_sweep = now
        for key in list(self._hits):
            hits = self._hits[key]
            if not hits or hits[-1] <= now - self._windows[key]:
                del self._hits[key]
                del self._windows[key]


class DailyCounter:
    """Counts events per name and resets when the UTC date changes."""

    def __init__(self, today: Callable[[], date] | None = None) -> None:
        self._today = today or (lambda: datetime.now(timezone.utc).date())
        self._day: date | None = None
        self._counts: dict[str, int] = {}
        self._lock = threading.Lock()

    def hit(self, name: str, limit: int) -> bool:
        with self._lock:
            today = self._today()
            if today != self._day:
                self._day = today
                self._counts = {}
            if self._counts.get(name, 0) >= limit:
                return False
            self._counts[name] = self._counts.get(name, 0) + 1
            return True


limiter = SlidingWindowLimiter()
daily = DailyCounter()


def client_ip(request: Request, trusted_hops: int) -> str:
    """
    The address to rate-limit on.

    Behind a reverse proxy the TCP peer is the PROXY, so every visitor would
    share one limit. The real address is in X-Forwarded-For, but a client can
    send that header itself, so the LEFT side of the list is attacker-controlled.
    Each trusted proxy APPENDS the address it saw, so with N trusted proxies
    the entry N-from-the-right is the one we can believe.
    """
    if trusted_hops > 0:
        raw = request.headers.get("x-forwarded-for", "")
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        if len(parts) >= trusted_hops:
            return parts[-trusted_hops]
    return request.client.host if request.client else "unknown"


def _seconds_until_utc_midnight() -> int:
    now = datetime.now(timezone.utc)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(1, int((midnight - now).total_seconds()))


def _reject(status: int, detail: str, retry_after: int | None = None) -> JSONResponse:
    headers = {"Retry-After": str(retry_after)} if retry_after else None
    # Same {"detail": ...} shape as FastAPI's own errors, so the frontend's
    # ApiError handling shows this message with no special casing.
    return JSONResponse({"detail": detail}, status_code=status, headers=headers)


_DELETE_REPO = re.compile(r"^/api/repos/[^/]+/?$")


def _classify(method: str, path: str) -> str | None:
    if method == "POST" and path == "/api/query":
        return "query"
    if method == "POST" and path == "/api/ingest":
        return "ingest"
    if method == "DELETE" and _DELETE_REPO.match(path):
        return "delete"
    return None


async def protect(request: Request, call_next):
    action = _classify(request.method, request.url.path)
    if action is None:  # reads, health checks and CORS preflights pass straight through
        return await call_next(request)

    if action in ("ingest", "delete") and settings.read_only_mode:
        return _reject(403, "This is a read-only demo: uploads and deletions are disabled.")

    if action in ("ingest", "delete"):
        # Guests may look around and ask questions; CHANGING data needs an
        # account. Checked before the size and rate checks below so that
        # anonymous junk can never spend the instance-wide daily budget.
        try:
            user = await run_in_threadpool(authenticate, request)
        except AuthError as exc:
            return _reject(401, str(exc))
        if user is None:
            return _reject(401, "Sign in to upload or delete repositories.")

    if action == "ingest":
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > MAX_REQUEST_BYTES:
            return _reject(413, "Archive too large")

    if action in ("query", "ingest"):
        if action == "query":
            limit, window_s, cap, noun = settings.query_rate_per_minute, 60, settings.daily_query_limit, "questions"
        else:
            limit, window_s, cap, noun = settings.ingest_rate_per_hour, 3600, settings.daily_ingest_limit, "uploads"

        ip = client_ip(request, settings.trusted_proxy_hops)
        wait = limiter.check(f"{action}:{ip}", limit, window_s)
        if wait is not None:
            seconds = math.ceil(wait)
            return _reject(429, f"Too many {noun}. Try again in {seconds} seconds.", seconds)

        if not daily.hit(action, cap):
            return _reject(
                503,
                "This demo has reached its daily limit. Please try again tomorrow.",
                _seconds_until_utc_midnight(),
            )

    return await call_next(request)


def install_protection(app: FastAPI) -> None:
    app.add_middleware(BaseHTTPMiddleware, dispatch=protect)