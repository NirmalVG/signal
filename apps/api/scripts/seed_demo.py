"""
Create (or repair) the shared demo repository that guests can explore.

Run from apps/api with the virtualenv active:

    python -m scripts.seed_demo            # create it, or repair what is missing
    python -m scripts.seed_demo --force    # delete it and index it again from scratch

Safe to run as often as you like:
  - nothing exists yet          -> creates and indexes the demo (uses embedding credits)
  - indexed, files on disk      -> does nothing
  - indexed, files missing      -> restores the files only (no re-embedding); this
                                   is what you need after a redeploy on a host
                                   whose disk is wiped, since citations are
                                   previewed from the files on disk
  - half-finished or --force    -> starts over
"""
from __future__ import annotations

import argparse
import shutil
import sys
import uuid
from pathlib import Path

from app.core.supabase import supabase
from app.services.indexer import run_indexing

DEMO_SOURCE = Path(__file__).resolve().parent.parent / "demo" / "acme-notes"
REPOS_DIR = Path("data/repos")
DEMO_NAME = "acme-notes (demo)"


def find_demo() -> dict | None:
    rows = supabase.table("repos").select("*").eq("is_demo", True).execute().data
    return rows[0] if rows else None


def copy_demo_files(repo_id: str) -> Path:
    """Place the demo source on disk the way an extracted zip would be: one wrapper folder."""
    destination = REPOS_DIR / repo_id / DEMO_SOURCE.name
    shutil.rmtree(destination, ignore_errors=True)
    shutil.copytree(
        DEMO_SOURCE, destination, ignore=shutil.ignore_patterns("__pycache__", "*.db")
    )
    return destination


def remove_demo(demo: dict) -> None:
    supabase.table("chunks").delete().eq("repo_id", demo["id"]).execute()
    supabase.table("queries").delete().eq("repo_id", demo["id"]).execute()
    supabase.table("repos").delete().eq("id", demo["id"]).execute()
    shutil.rmtree(REPOS_DIR / demo["id"], ignore_errors=True)


def main(force: bool = False) -> int:
    demo = find_demo()

    if demo and demo["status"] == "indexed" and not force:
        if (REPOS_DIR / demo["id"] / DEMO_SOURCE.name).exists():
            print(f"Demo repo {demo['id']} is already set up.")
        else:
            copy_demo_files(demo["id"])
            print(f"Demo repo {demo['id']} was indexed but its files were missing: restored them.")
        return 0

    if demo:
        print(f"Removing the previous demo repo ({demo['status']}) before starting over.")
        remove_demo(demo)

    repo_id = str(uuid.uuid4())
    # user_id stays NULL and is_demo is true: owned by nobody, visible to guests.
    supabase.table("repos").insert(
        {"id": repo_id, "name": DEMO_NAME, "status": "extracted", "user_id": None, "is_demo": True}
    ).execute()
    root = copy_demo_files(repo_id)

    print("Indexing the demo repo (chunking, embedding, storing)...")
    run_indexing(repo_id, root)  # runs synchronously here; sets status to indexed or failed

    status = supabase.table("repos").select("status").eq("id", repo_id).execute().data[0]["status"]
    if status != "indexed":
        print(f"Indexing ended with status '{status}'. See the error printed above.")
        return 1
    print(f"Done. Demo repo {repo_id} is ready for guests.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or repair the shared demo repository.")
    parser.add_argument("--force", action="store_true", help="delete and re-index from scratch")
    sys.exit(main(force=parser.parse_args().force))
