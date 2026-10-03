"""
Tests for app/core/protection.py: rate limits, daily caps, read-only mode,
proxy-aware client IPs, and how the middleware is wired into the real app.

No database or API keys needed: the modules that talk to Supabase / the LLM
are replaced with stubs before the real app is imported.
"""
import io
import sys
import types

import pytest
from fastapi.testclient import TestClient
from starlette import formparsers

from app.core import protection
from app.core.config import settings
from app.core.protection import DailyCounter, SlidingWindowLimiter, client_ip


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


# --------------------------------------------------------------------------
# SlidingWindowLimiter
# --------------------------------------------------------------------------
def test_limiter_allows_up_to_the_limit_then_blocks():
    clock = FakeClock()
    lim = SlidingWindowLimiter(clock)
    assert [lim.check("ip", 3, 60) for _ in range(3)] == [None, None, None]
    wait = lim.check("ip", 3, 60)
    assert wait is not None and 0 < wait <= 60


def test_limiter_frees_a_slot_when_the_window_slides():
    clock = FakeClock()
    lim = SlidingWindowLimiter(clock)
    for _ in range(3):
        lim.check("ip", 3, 60)
    clock.now += 61
    assert lim.check("ip", 3, 60) is None


def test_retry_after_matches_when_the_oldest_hit_expires():
    clock = FakeClock()
    lim = SlidingWindowLimiter(clock)
    lim.check("ip", 1, 60)
    clock.now += 20
    assert lim.check("ip", 1, 60) == pytest.approx(40)


def test_rejected_requests_do_not_extend_the_block():
    clock = FakeClock()
    lim = SlidingWindowLimiter(clock)
    lim.check("ip", 1, 60)
    for _ in range(50):  # hammering while blocked...
        clock.now += 1
        lim.check("ip", 1, 60)
    clock.now += 11  # ...must not push the unblock time past the first hit + 60s
    assert lim.check("ip", 1, 60) is None


def test_limiter_keys_are_independent():
    lim = SlidingWindowLimiter(FakeClock())
    assert lim.check("a", 1, 60) is None
    assert lim.check("b", 1, 60) is None
    assert lim.check("a", 1, 60) is not None


def test_limiter_forgets_idle_keys():
    clock = FakeClock()
    lim = SlidingWindowLimiter(clock)
    for i in range(100):
        lim.check(f"ip{i}", 5, 60)
    clock.now += 1000  # long after every window, and past the 300s sweep interval
    lim.check("fresh", 5, 60)
    assert len(lim._hits) == 1


# --------------------------------------------------------------------------
# DailyCounter
# --------------------------------------------------------------------------
def test_daily_counter_caps_and_resets_on_a_new_utc_day():
    from datetime import date

    today = {"d": date(2026, 10, 1)}
    counter = DailyCounter(lambda: today["d"])
    assert counter.hit("query", 2) and counter.hit("query", 2)
    assert not counter.hit("query", 2)
    assert counter.hit("ingest", 2)  # separate budget per action
    today["d"] = date(2026, 10, 2)
    assert counter.hit("query", 2)


# --------------------------------------------------------------------------
# client_ip
# --------------------------------------------------------------------------
def make_request(headers: dict[str, str], peer: str = "10.0.0.9"):
    from starlette.requests import Request

    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (peer, 1234),
    }
    return Request(scope)


def test_ip_ignores_forwarded_header_when_no_proxy_is_trusted():
    req = make_request({"X-Forwarded-For": "1.1.1.1"})
    assert client_ip(req, trusted_hops=0) == "10.0.0.9"


def test_ip_uses_the_entry_added_by_the_trusted_proxy():
    req = make_request({"X-Forwarded-For": "203.0.113.7"})
    assert client_ip(req, trusted_hops=1) == "203.0.113.7"


def test_ip_cannot_be_spoofed_by_prepending_fake_addresses():
    # The client sent "6.6.6.6"; our proxy appended the real address.
    req = make_request({"X-Forwarded-For": "6.6.6.6, 203.0.113.7"})
    assert client_ip(req, trusted_hops=1) == "203.0.113.7"


def test_ip_falls_back_to_the_peer_when_the_header_is_missing_or_too_short():
    assert client_ip(make_request({}), trusted_hops=1) == "10.0.0.9"
    assert client_ip(make_request({"X-Forwarded-For": "1.1.1.1"}), trusted_hops=2) == "10.0.0.9"


# --------------------------------------------------------------------------
# The real app, end to end
# --------------------------------------------------------------------------
@pytest.fixture
def client(monkeypatch):
    stubs = {
        "app.core.supabase": {"supabase": None},
        "app.services.indexer": {"run_indexing": lambda *a, **k: None, "search_chunks": lambda *a, **k: []},
        "app.services.answering": {"answer_question": lambda repo_id, q: {"answer": "ok", "context": [], "confidence": 0.0, "latency_ms": 1}},
    }
    for name, attrs in stubs.items():
        module = types.ModuleType(name)
        for key, value in attrs.items():
            setattr(module, key, value)
        monkeypatch.setitem(sys.modules, name, module)
    for name in [n for n in sys.modules if n == "app.main" or n.startswith("app.routes")]:
        monkeypatch.delitem(sys.modules, name)

    monkeypatch.setattr(protection, "limiter", SlidingWindowLimiter(FakeClock()))
    monkeypatch.setattr(protection, "daily", DailyCounter())
    monkeypatch.setattr(settings, "read_only_mode", False)
    monkeypatch.setattr(settings, "trusted_proxy_hops", 0)
    monkeypatch.setattr(settings, "query_rate_per_minute", 2)
    monkeypatch.setattr(settings, "daily_query_limit", 1000)
    monkeypatch.setattr(settings, "ingest_rate_per_hour", 2)
    monkeypatch.setattr(settings, "daily_ingest_limit", 1000)
    monkeypatch.setattr(settings, "cors_origins", "http://localhost:3000")

    from app.main import app

    return TestClient(app)


def ask(client, **kw):
    return client.post("/api/query", json={"repo_id": "r", "question": "hi"}, **kw)


def test_query_is_rate_limited_per_ip_with_retry_after(client):
    assert ask(client).status_code == 200
    assert ask(client).status_code == 200
    blocked = ask(client)
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) >= 1
    assert "Try again in" in blocked.json()["detail"]


def test_rate_limit_responses_carry_cors_headers(client):
    origin = {"Origin": "http://localhost:3000"}
    ask(client, headers=origin)
    ask(client, headers=origin)
    blocked = ask(client, headers=origin)
    assert blocked.status_code == 429
    # Without CORS headers the browser would report a vague network error
    # instead of letting the UI read the message above.
    assert blocked.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_middleware_wraps_protection_in_the_real_app(client):
    from app.main import app

    names = [m.cls.__name__ for m in app.user_middleware]  # outermost first
    assert names.index("CORSMiddleware") < names.index("BaseHTTPMiddleware")


def test_each_ip_gets_its_own_budget_behind_a_trusted_proxy(client, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)
    for _ in range(2):
        assert ask(client, headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 200
    assert ask(client, headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 429
    assert ask(client, headers={"X-Forwarded-For": "198.51.100.2"}).status_code == 200


def test_daily_cap_returns_503_even_for_a_fresh_ip(client, monkeypatch):
    monkeypatch.setattr(settings, "daily_query_limit", 1)
    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)
    assert ask(client, headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 200
    capped = ask(client, headers={"X-Forwarded-For": "198.51.100.2"})
    assert capped.status_code == 503
    assert int(capped.headers["retry-after"]) >= 1


def test_overlong_questions_are_rejected_before_any_credits_are_spent(client):
    res = client.post("/api/query", json={"repo_id": "r", "question": "x" * 2001})
    assert res.status_code == 422


def test_read_only_mode_blocks_uploads_and_deletes_but_not_reads(client, monkeypatch):
    monkeypatch.setattr(settings, "read_only_mode", True)
    zipfile = {"file": ("repo.zip", io.BytesIO(b"PK"), "application/zip")}
    assert client.post("/api/ingest", files=zipfile).status_code == 403
    assert client.delete("/api/repos/abc").status_code == 403
    assert client.get("/api/config").json() == {"read_only": True}
    assert ask(client).status_code == 200  # asking questions stays allowed


def test_config_endpoint_reports_writable_by_default(client):
    assert client.get("/api/config").json() == {"read_only": False}


def test_oversized_upload_is_refused_from_the_header_alone(client, make_token):
    res = client.post("/api/ingest", content=b"x", headers={
        "Authorization": f"Bearer {make_token()}",
        "Content-Type": "multipart/form-data; boundary=x",
        "Content-Length": str(protection.MAX_REQUEST_BYTES + 1),
    })
    assert res.status_code == 413


def test_rejected_upload_body_is_never_parsed(client, monkeypatch):
    """The reason this is a middleware: a dependency would parse first."""
    calls = {"n": 0}
    original = formparsers.MultiPartParser.parse

    async def spy(self):
        calls["n"] += 1
        return await original(self)

    monkeypatch.setattr(formparsers.MultiPartParser, "parse", spy)
    monkeypatch.setattr(settings, "read_only_mode", True)
    big = {"file": ("repo.zip", io.BytesIO(b"a" * 2_000_000), "application/zip")}
    assert client.post("/api/ingest", files=big).status_code == 403
    assert calls["n"] == 0


# --------------------------------------------------------------------------
# Sign-in requirement for uploads and deletes
# --------------------------------------------------------------------------
def test_guests_cannot_upload_or_delete(client):
    zipfile = {"file": ("repo.zip", io.BytesIO(b"PK"), "application/zip")}
    res = client.post("/api/ingest", files=zipfile)
    assert res.status_code == 401
    assert "Sign in" in res.json()["detail"]
    assert client.delete("/api/repos/abc").status_code == 401


def test_guests_can_still_ask_questions(client):
    assert ask(client).status_code == 200


def test_an_expired_session_cannot_delete(client, make_token):
    expired = make_token(expires_in=-10)
    res = client.delete("/api/repos/abc", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"]


def test_anonymous_requests_never_spend_the_daily_upload_budget(client):
    for _ in range(5):
        client.delete("/api/repos/abc")
        client.post("/api/ingest", files={"file": ("r.zip", io.BytesIO(b"PK"), "application/zip")})
    assert protection.daily._counts.get("ingest", 0) == 0


def test_rejected_anonymous_upload_body_is_never_parsed(client, monkeypatch):
    calls = {"n": 0}
    original = formparsers.MultiPartParser.parse

    async def spy(self):
        calls["n"] += 1
        return await original(self)

    monkeypatch.setattr(formparsers.MultiPartParser, "parse", spy)
    big = {"file": ("repo.zip", io.BytesIO(b"a" * 2_000_000), "application/zip")}
    assert client.post("/api/ingest", files=big).status_code == 401
    assert calls["n"] == 0