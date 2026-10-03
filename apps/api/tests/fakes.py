"""
An in-memory stand-in for the Supabase client, plus the module stubs the
route tests need. Just enough of the query builder for this app:
select / insert / update / delete with .eq() filters and .order().
"""
from __future__ import annotations

import sys
import types
from types import SimpleNamespace

from app.core import protection
from app.core.config import settings
from app.core.protection import DailyCounter, SlidingWindowLimiter


class FakeSupabase:
    def __init__(self, repos: list[dict] | None = None) -> None:
        self.tables: dict[str, list[dict]] = {
            "repos": [dict(r) for r in (repos or [])],
            "chunks": [],
            "queries": [],
        }

    def table(self, name: str) -> "_Query":
        return _Query(self, name)


class _Query:
    def __init__(self, db: FakeSupabase, name: str) -> None:
        self.db, self.name = db, name
        self.op, self.payload = "select", None
        self.filters: list[tuple[str, object]] = []
        self.sort: tuple[str, bool] | None = None

    def select(self, _columns: str = "*"):
        self.op = "select"
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, values: dict):
        self.op, self.payload = "update", values
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, column: str, value):
        self.filters.append((column, value))
        return self

    def order(self, column: str, desc: bool = False):
        self.sort = (column, desc)
        return self

    def execute(self):
        rows = self.db.tables[self.name]

        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            created = []
            for item in items:
                row = dict(item)
                if self.name == "repos":  # column defaults from the migration
                    row.setdefault("user_id", None)
                    row.setdefault("is_demo", False)
                    row.setdefault("ingested_at", None)
                rows.append(row)
                created.append(dict(row))
            return SimpleNamespace(data=created)

        matching = [r for r in rows if all(r.get(c) == v for c, v in self.filters)]

        if self.op == "update":
            for row in matching:
                row.update(self.payload)
            return SimpleNamespace(data=[dict(r) for r in matching])

        if self.op == "delete":
            self.db.tables[self.name] = [r for r in rows if r not in matching]
            if self.name == "repos":  # ON DELETE CASCADE
                gone = {r["id"] for r in matching}
                for child in ("chunks", "queries"):
                    self.db.tables[child] = [
                        r for r in self.db.tables[child] if r.get("repo_id") not in gone
                    ]
            return SimpleNamespace(data=[dict(r) for r in matching])

        if self.sort:
            column, desc = self.sort
            matching = sorted(matching, key=lambda r: r.get(column) or "", reverse=desc)
        return SimpleNamespace(data=[dict(r) for r in matching])


def install_stubs(monkeypatch, db: FakeSupabase) -> None:
    """Swap the modules that need a database / API keys, and reset module caches."""
    stubs = {
        "app.core.supabase": {"supabase": db},
        "app.services.indexer": {
            "run_indexing": lambda *a, **k: None,
            "search_chunks": lambda *a, **k: [],
        },
        "app.services.answering": {
            "answer_question": lambda repo_id, q: {
                "answer": "ok", "context": [], "confidence": 0.0, "latency_ms": 1,
            }
        },
    }
    for name, attrs in stubs.items():
        module = types.ModuleType(name)
        for key, value in attrs.items():
            setattr(module, key, value)
        monkeypatch.setitem(sys.modules, name, module)

    # Anything that captured the previous stub at import time must be re-imported.
    for name in [
        n for n in sys.modules
        if n in ("app.main", "app.core.access") or n.startswith("app.routes")
    ]:
        monkeypatch.delitem(sys.modules, name)


def generous_limits(monkeypatch) -> None:
    """Fresh counters and roomy limits, so ownership tests never hit a 429."""
    monkeypatch.setattr(protection, "limiter", SlidingWindowLimiter())
    monkeypatch.setattr(protection, "daily", DailyCounter())
    monkeypatch.setattr(settings, "read_only_mode", False)
    monkeypatch.setattr(settings, "trusted_proxy_hops", 0)
    monkeypatch.setattr(settings, "query_rate_per_minute", 1000)
    monkeypatch.setattr(settings, "daily_query_limit", 100000)
    monkeypatch.setattr(settings, "ingest_rate_per_hour", 1000)
    monkeypatch.setattr(settings, "daily_ingest_limit", 100000)
    monkeypatch.setattr(settings, "cors_origins", "http://localhost:3000")
