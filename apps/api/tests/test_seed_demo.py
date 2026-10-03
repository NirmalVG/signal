"""The seed script must be safe to run repeatedly and must never create a second demo."""
import importlib
import sys

import pytest

from tests.fakes import FakeSupabase, install_stubs


@pytest.fixture
def seed(monkeypatch, tmp_path):
    db = FakeSupabase()
    install_stubs(monkeypatch, db)
    monkeypatch.delitem(sys.modules, "scripts.seed_demo", raising=False)

    # import_module (not "from scripts import ...") so each test gets a module
    # freshly bound to ITS fake database, not one cached by an earlier test.
    seed_demo = importlib.import_module("scripts.seed_demo")

    calls = []

    def fake_run_indexing(repo_id, root):
        calls.append(repo_id)
        # what the real indexer does on success
        db.table("repos").update({"status": "indexed"}).eq("id", repo_id).execute()
        db.tables["chunks"].append({"repo_id": repo_id, "file_path": "server/auth.py"})

    monkeypatch.setattr(seed_demo, "REPOS_DIR", tmp_path / "repos")
    monkeypatch.setattr(seed_demo, "run_indexing", fake_run_indexing)
    return seed_demo, db, calls


def demos(db):
    return [r for r in db.tables["repos"] if r["is_demo"]]


def test_first_run_creates_one_ownerless_demo_and_indexes_it(seed):
    seed_demo, db, calls = seed
    assert seed_demo.main() == 0
    (demo,) = demos(db)
    assert demo["user_id"] is None
    assert demo["status"] == "indexed"
    assert calls == [demo["id"]]
    # files sit in one wrapper folder, like an extracted zip
    assert (seed_demo.REPOS_DIR / demo["id"] / "acme-notes" / "server" / "auth.py").is_file()


def test_running_it_again_changes_nothing(seed):
    seed_demo, db, calls = seed
    seed_demo.main()
    before = demos(db)
    assert seed_demo.main() == 0
    assert demos(db) == before
    assert len(calls) == 1  # no second round of paid embedding


def test_missing_files_are_restored_without_reindexing(seed):
    import shutil

    seed_demo, db, calls = seed
    seed_demo.main()
    (demo,) = demos(db)
    shutil.rmtree(seed_demo.REPOS_DIR / demo["id"])  # e.g. a redeploy wiped the disk

    assert seed_demo.main() == 0
    assert (seed_demo.REPOS_DIR / demo["id"] / "acme-notes" / "README.md").is_file()
    assert len(calls) == 1


def test_a_failed_attempt_is_replaced_not_duplicated(seed):
    seed_demo, db, calls = seed
    seed_demo.main()
    (old,) = demos(db)
    db.table("repos").update({"status": "failed"}).eq("id", old["id"]).execute()

    assert seed_demo.main() == 0
    (new,) = demos(db)
    assert new["id"] != old["id"]
    assert all(c["repo_id"] != old["id"] for c in db.tables["chunks"])


def test_force_starts_over(seed):
    seed_demo, db, calls = seed
    seed_demo.main()
    seed_demo.main(force=True)
    assert len(demos(db)) == 1
    assert len(calls) == 2


def test_a_failed_index_reports_failure(seed, monkeypatch):
    seed_demo, db, _ = seed

    def failing(repo_id, root):
        db.table("repos").update({"status": "failed"}).eq("id", repo_id).execute()

    monkeypatch.setattr(seed_demo, "run_indexing", failing)
    assert seed_demo.main() == 1


def test_no_database_or_cache_files_are_copied(seed):
    seed_demo, db, _ = seed
    (seed_demo.DEMO_SOURCE / "__pycache__").mkdir(exist_ok=True)
    (seed_demo.DEMO_SOURCE / "__pycache__" / "x.pyc").write_bytes(b"x")
    (seed_demo.DEMO_SOURCE / "notes.db").write_bytes(b"x")
    try:
        seed_demo.main()
        (demo,) = demos(db)
        root = seed_demo.REPOS_DIR / demo["id"] / "acme-notes"
        assert not (root / "__pycache__").exists()
        assert not (root / "notes.db").exists()
    finally:
        import shutil
        shutil.rmtree(seed_demo.DEMO_SOURCE / "__pycache__", ignore_errors=True)
        (seed_demo.DEMO_SOURCE / "notes.db").unlink(missing_ok=True)
