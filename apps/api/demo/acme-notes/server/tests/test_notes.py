"""Tests for the rules that matter most: privacy, passwords and tokens."""
import time

import pytest

from server import auth, notes, search
from server.config import settings
from server.db import init_db


@pytest.fixture(autouse=True)
def fresh_database(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "test.db"))
    init_db()


def make_user(email: str) -> int:
    return auth.register(email, "correct horse battery")


def test_users_cannot_read_each_others_notes():
    alice, bob = make_user("alice@example.com"), make_user("bob@example.com")
    note = notes.create_note(alice, "Secret plan", "Launch on Friday")
    with pytest.raises(notes.NotFound):
        notes.get_note(bob, note["id"])


def test_users_cannot_delete_each_others_notes():
    alice, bob = make_user("alice@example.com"), make_user("bob@example.com")
    note = notes.create_note(alice, "Mine", "hands off")
    with pytest.raises(notes.NotFound):
        notes.delete_note(bob, note["id"])
    assert notes.get_note(alice, note["id"])["title"] == "Mine"


def test_passwords_are_stored_as_salted_hashes():
    first = auth.hash_password("hunter2hunter2")
    second = auth.hash_password("hunter2hunter2")
    assert first != second
    assert "hunter2" not in first
    assert auth.verify_password("hunter2hunter2", first)
    assert not auth.verify_password("wrong-password", first)


def test_short_passwords_are_refused():
    with pytest.raises(auth.AuthError):
        auth.register("short@example.com", "tiny")


def test_expired_tokens_are_refused(monkeypatch):
    user_id = make_user("alice@example.com")
    token = auth.issue_token(user_id)
    monkeypatch.setattr(time, "time", lambda: 9_999_999_999)  # far in the future
    with pytest.raises(auth.AuthError):
        auth.verify_token(token)


def test_tampered_tokens_are_refused():
    token = auth.issue_token(make_user("alice@example.com"))
    payload, signature = token.split(".")
    with pytest.raises(auth.AuthError):
        auth.verify_token(f"{payload}.{'0' * len(signature)}")


def test_title_matches_outrank_body_matches():
    owner = make_user("alice@example.com")
    notes.create_note(owner, "Groceries", "buy milk and eggs")
    notes.create_note(owner, "Milk run", "the shop closes at six")
    results = search.search_notes(owner, "milk")
    assert [n["title"] for n in results] == ["Milk run", "Groceries"]


def test_search_only_returns_the_callers_notes():
    alice, bob = make_user("alice@example.com"), make_user("bob@example.com")
    notes.create_note(alice, "Budget", "quarterly numbers")
    assert search.search_notes(bob, "budget") == []
