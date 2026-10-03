"""
Who can see and change which repository?

The rules under test:
  - a signed-in user sees ONLY the repos they uploaded;
  - a guest sees ONLY the shared demo repo;
  - nobody can read, query, preview or delete a repo that isn't theirs, and
    the answer is the same 404 as for a repo that doesn't exist;
  - the demo can't be deleted through the API by anyone.

The whole real app runs here; only the database and the AI services are fakes.
"""
import io
import zipfile
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.auth import CurrentUser
from tests.fakes import FakeSupabase, generous_limits, install_stubs

ALICE = "aaaaaaaa-0000-4000-8000-000000000001"
BOB = "bbbbbbbb-0000-4000-8000-000000000002"
DEMO_REPO = "d0000000-0000-4000-8000-000000000000"
ALICE_REPO = "a0000000-0000-4000-8000-000000000001"
BOB_REPO = "b0000000-0000-4000-8000-000000000002"
MISSING_REPO = "e0000000-0000-4000-8000-0000000000ff"

NOT_FOUND = {"detail": "Repo not found"}


def repo_row(repo_id, name, user_id=None, is_demo=False):
    return {
        "id": repo_id, "name": name, "status": "indexed",
        "user_id": user_id, "is_demo": is_demo, "ingested_at": "2026-10-01T00:00:00Z",
    }


@pytest.fixture
def world(monkeypatch, tmp_path, make_token):
    db = FakeSupabase([
        repo_row(DEMO_REPO, "acme-notes (demo)", is_demo=True),
        repo_row(ALICE_REPO, "alice-app", user_id=ALICE),
        repo_row(BOB_REPO, "bob-app", user_id=BOB),
    ])
    for repo_id in (DEMO_REPO, ALICE_REPO, BOB_REPO):
        db.tables["chunks"].append({"repo_id": repo_id, "file_path": "main.py"})
        db.tables["queries"].append({"repo_id": repo_id, "question": "q"})

    install_stubs(monkeypatch, db)
    generous_limits(monkeypatch)

    from app.main import app
    from app.routes import ingest, repos

    repos_dir = tmp_path / "repos"
    monkeypatch.setattr(repos, "REPOS_DIR", repos_dir)
    monkeypatch.setattr(ingest, "UPLOAD_DIR", tmp_path / "uploads")
    monkeypatch.setattr(ingest, "EXTRACT_DIR", repos_dir)
    for repo_id in (DEMO_REPO, ALICE_REPO, BOB_REPO):
        folder = repos_dir / repo_id / "src"
        folder.mkdir(parents=True)
        (folder / "main.py").write_text(f"# source of {repo_id}\n")

    def auth(user_id):
        return {"Authorization": f"Bearer {make_token(sub=user_id)}"}

    return SimpleNamespace(
        client=TestClient(app), db=db, repos_dir=repos_dir,
        alice=auth(ALICE), bob=auth(BOB), guest={},
    )


def ids(response):
    assert response.status_code == 200
    return {r["id"] for r in response.json()}


# ---- what each person sees in the list ---------------------------------------
def test_a_guest_sees_only_the_demo(world):
    assert ids(world.client.get("/api/repos")) == {DEMO_REPO}


def test_a_signed_in_user_sees_only_their_own_repos(world):
    assert ids(world.client.get("/api/repos", headers=world.alice)) == {ALICE_REPO}
    assert ids(world.client.get("/api/repos", headers=world.bob)) == {BOB_REPO}


def test_a_new_user_with_no_uploads_sees_an_empty_list(world, make_token):
    newcomer = {"Authorization": f"Bearer {make_token(sub='cccccccc-0000-4000-8000-000000000003')}"}
    assert world.client.get("/api/repos", headers=newcomer).json() == []


def test_a_bad_token_is_an_error_not_a_silent_guest(world, make_token):
    expired = {"Authorization": f"Bearer {make_token(sub=ALICE, expires_in=-5)}"}
    assert world.client.get("/api/repos", headers=expired).status_code == 401


# ---- status ----------------------------------------------------------------------------
def test_owner_and_demo_visitor_can_read_status(world):
    assert world.client.get(f"/api/repos/{ALICE_REPO}/status", headers=world.alice).status_code == 200
    assert world.client.get(f"/api/repos/{DEMO_REPO}/status").status_code == 200


@pytest.mark.parametrize("who", ["guest", "bob"])
def test_other_people_cannot_read_alices_status(world, who):
    res = world.client.get(f"/api/repos/{ALICE_REPO}/status", headers=getattr(world, who))
    assert res.status_code == 404


def test_forbidden_looks_exactly_like_missing(world):
    forbidden = world.client.get(f"/api/repos/{BOB_REPO}/status", headers=world.alice)
    missing = world.client.get(f"/api/repos/{MISSING_REPO}/status", headers=world.alice)
    assert forbidden.status_code == missing.status_code == 404
    assert forbidden.json() == missing.json() == NOT_FOUND


def test_a_signed_in_user_only_gets_their_own_repos_not_the_demo(world):
    assert world.client.get(f"/api/repos/{DEMO_REPO}/status", headers=world.alice).status_code == 404


def test_malformed_repo_ids_are_404(world):
    assert world.client.get("/api/repos/not-a-uuid/status", headers=world.alice).status_code == 404


# ---- asking questions --------------------------------------------------------------------
def ask(world, repo_id, headers):
    return world.client.post(
        "/api/query", json={"repo_id": repo_id, "question": "hi"}, headers=headers
    )


def test_owner_and_demo_visitor_can_ask(world):
    assert ask(world, ALICE_REPO, world.alice).status_code == 200
    assert ask(world, DEMO_REPO, world.guest).status_code == 200


@pytest.mark.parametrize(
    "repo_id, who",
    [(ALICE_REPO, "guest"), (ALICE_REPO, "bob"), (BOB_REPO, "alice"), (DEMO_REPO, "alice")],
)
def test_nobody_can_ask_about_a_repo_that_is_not_theirs(world, repo_id, who):
    res = ask(world, repo_id, getattr(world, who))
    assert res.status_code == 404
    assert res.json() == NOT_FOUND


# ---- source file preview -----------------------------------------------------------------
def file_url(repo_id):
    return f"/api/repos/{repo_id}/file"


def test_owner_and_demo_visitor_can_preview_files(world):
    assert world.client.get(file_url(ALICE_REPO), params={"path": "main.py"}, headers=world.alice).status_code == 200
    assert world.client.get(file_url(DEMO_REPO), params={"path": "main.py"}).status_code == 200


@pytest.mark.parametrize("who", ["guest", "bob"])
def test_other_people_cannot_read_alices_source_files(world, who):
    res = world.client.get(file_url(ALICE_REPO), params={"path": "main.py"}, headers=getattr(world, who))
    assert res.status_code == 404
    assert "source of" not in res.text


# ---- deleting ------------------------------------------------------------------------------
def repo_ids_in_db(world):
    return {r["id"] for r in world.db.tables["repos"]}


def test_owner_can_delete_their_repo_and_everything_attached(world):
    res = world.client.delete(f"/api/repos/{ALICE_REPO}", headers=world.alice)
    assert res.status_code == 200
    assert ALICE_REPO not in repo_ids_in_db(world)
    assert all(c["repo_id"] != ALICE_REPO for c in world.db.tables["chunks"])
    assert all(q["repo_id"] != ALICE_REPO for q in world.db.tables["queries"])
    assert not (world.repos_dir / ALICE_REPO).exists()


def test_you_cannot_delete_someone_elses_repo(world):
    res = world.client.delete(f"/api/repos/{BOB_REPO}", headers=world.alice)
    assert res.status_code == 404
    assert BOB_REPO in repo_ids_in_db(world)
    assert (world.repos_dir / BOB_REPO).exists()


def test_nobody_can_delete_the_demo(world):
    for headers in (world.alice, world.bob):
        assert world.client.delete(f"/api/repos/{DEMO_REPO}", headers=headers).status_code == 404
    assert world.client.delete(f"/api/repos/{DEMO_REPO}").status_code == 401  # guests aren't even allowed to try
    assert DEMO_REPO in repo_ids_in_db(world)


# ---- uploading -------------------------------------------------------------------------------
def make_zip() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("my-app/main.py", "print('hello')\n")
    return buffer.getvalue()


def test_an_upload_belongs_to_the_uploader_and_to_nobody_else(world):
    upload = {"file": ("my-app.zip", make_zip(), "application/zip")}
    res = world.client.post("/api/ingest", files=upload, headers=world.alice)
    assert res.status_code == 200
    new_id = res.json()["repo_id"]

    stored = next(r for r in world.db.tables["repos"] if r["id"] == new_id)
    assert stored["user_id"] == ALICE
    assert stored["is_demo"] is False

    assert new_id in ids(world.client.get("/api/repos", headers=world.alice))
    assert new_id not in ids(world.client.get("/api/repos", headers=world.bob))
    assert new_id not in ids(world.client.get("/api/repos"))
    assert world.client.get(f"/api/repos/{new_id}/status", headers=world.bob).status_code == 404


# ---- the rule itself ----------------------------------------------------------------------------
@pytest.mark.parametrize(
    "repo, user, expected",
    [
        ({"user_id": ALICE, "is_demo": False}, CurrentUser(ALICE), True),
        ({"user_id": ALICE, "is_demo": False}, CurrentUser(BOB), False),
        ({"user_id": ALICE, "is_demo": False}, None, False),
        ({"user_id": None, "is_demo": True}, None, True),
        ({"user_id": None, "is_demo": True}, CurrentUser(ALICE), False),
        ({"user_id": None, "is_demo": False}, None, False),  # orphan: visible to no one
        ({"user_id": None, "is_demo": False}, CurrentUser(ALICE), False),
    ],
)
def test_can_access_truth_table(monkeypatch, repo, user, expected):
    # access.py imports the Supabase client at import time, so stub it first.
    install_stubs(monkeypatch, FakeSupabase())
    from app.core.access import can_access

    assert can_access(repo, user) is expected
