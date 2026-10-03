"""
Who may touch which repository?  One rule, in one place:

  - a signed-in user may use ONLY the repositories they uploaded;
  - a guest may use ONLY the shared demo repository;
  - anything else answers "404 Repo not found", exactly like a repo that does
    not exist, so nobody can probe for ids that belong to other people.

WHY THIS LIVES IN PYTHON AND NOT IN THE DATABASE: this API talks to Supabase
with the service_role key, which bypasses Row Level Security by design. RLS
(enabled in sql/migrations/002_repo_ownership.sql) protects the OTHER door,
Supabase's public REST endpoint. This module protects the door the app uses.
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException

from app.core.auth import CurrentUser
from app.core.supabase import supabase


def can_access(repo: dict, user: CurrentUser | None) -> bool:
    if user is not None:
        return repo.get("user_id") == user.id
    return bool(repo.get("is_demo"))


def get_repo_for(repo_id: str, user: CurrentUser | None) -> dict:
    """Return the repo row if `user` may use it, otherwise raise 404."""
    not_found = HTTPException(status_code=404, detail="Repo not found")
    try:
        uuid.UUID(repo_id)  # also keeps garbage out of the database filter
    except ValueError:
        raise not_found from None

    rows = supabase.table("repos").select("*").eq("id", repo_id).execute().data
    if not rows or not can_access(rows[0], user):
        raise not_found
    return rows[0]
