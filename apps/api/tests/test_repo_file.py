"""
Security tests for GET /api/repos/{repo_id}/file.

`path` is attacker-controlled, so every way of escaping the repo folder
must be rejected. These tests need no database or API keys: the modules that
talk to Supabase / embedding services are stubbed out.
"""
import os
import uuid
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from tests.fakes import FakeSupabase, install_stubs


@pytest.fixture
def env(tmp_path, monkeypatch):
    repo_id = str(uuid.uuid4())
    # The repo is the shared demo, so the guest requests below are allowed to
    # see it; ownership rules have their own tests in test_ownership.py.
    db = FakeSupabase([
        {"id": repo_id, "name": "my-repo", "status": "indexed", "user_id": None, "is_demo": True}
    ])
    install_stubs(monkeypatch, db)

    from app.routes import repos

    monkeypatch.setattr(repos, "REPOS_DIR", tmp_path)

    root = tmp_path / repo_id / "my-repo"  # one wrapper folder, like a real zip
    (root / "app" / "(auth)").mkdir(parents=True)
    (root / "app" / "main.py").write_text("print('hi')\n")
    (root / "app" / "(auth)" / "page.tsx").write_text("export default 1\n")
    (root / "big.txt").write_bytes(b"a" * (repos.MAX_PREVIEW_BYTES + 1))

    (tmp_path / "SECRET.txt").write_text("top secret")  # outside the repo
    evil = tmp_path / f"{repo_id}-evil"  # sibling sharing the repo's name prefix
    evil.mkdir()
    (evil / "x.txt").write_text("evil")

    app = FastAPI()
    app.include_router(repos.router, prefix="/api")
    return TestClient(app), repo_id, root


def fetch(env, path, repo_id=None):
    client, rid, _ = env
    return client.get(f"/api/repos/{repo_id or rid}/file", params={"path": path})


def test_serves_a_normal_file(env):
    res = fetch(env, "app/main.py")
    assert res.status_code == 200
    assert res.json()["content"] == "print('hi')\n"
    assert res.json()["line_count"] == 2


def test_serves_next_js_route_group_paths(env):
    assert fetch(env, "app/(auth)/page.tsx").status_code == 200


@pytest.mark.parametrize(
    "path",
    [
        "../../SECRET.txt",  # climb out of the repo
        "../../../../../../etc/passwd",  # deep traversal
        "/etc/passwd",  # absolute path replaces the root in pathlib
        "app/main.py\x00.png",  # null-byte trick
    ],
)
def test_rejects_paths_that_escape_the_repo(env, path):
    assert fetch(env, path).status_code == 400


def test_rejects_prefix_sibling_directory(env):
    _, rid, _ = env
    # "<id>-evil" starts with "<id>": a naive str.startswith check would allow it.
    assert fetch(env, f"../../{rid}-evil/x.txt").status_code == 400


def test_rejects_symlink_pointing_outside(env):
    _, _, root = env
    try:
        os.symlink(Path("/etc/passwd"), root / "link.txt")
    except (OSError, NotImplementedError):
        pytest.skip("symlinks not available on this platform")
    assert fetch(env, "link.txt").status_code == 400


def test_missing_file_and_directory_are_404(env):
    assert fetch(env, "nope.py").status_code == 404
    assert fetch(env, "app").status_code == 404


def test_oversized_file_is_413(env):
    assert fetch(env, "big.txt").status_code == 413


def test_bad_or_unknown_repo_id_is_404(env):
    assert fetch(env, "app/main.py", repo_id="not-a-uuid").status_code == 404
    assert fetch(env, "app/main.py", repo_id=str(uuid.uuid4())).status_code == 404