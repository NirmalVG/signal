# Place this file at: apps/api/app/routes/repos.py

import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.access import get_repo_for
from app.core.auth import OptionalUser, RequiredUser
from app.core.supabase import supabase
from app.routes.ingest import find_repo_root

router = APIRouter()

REPOS_DIR = Path("data/repos")
MAX_PREVIEW_BYTES = 1024 * 1024


@router.get("/repos")
def list_repos(user: OptionalUser):
    query = supabase.table("repos").select("*")
    # Signed in -> exactly your own uploads. Guest -> only the shared demo.
    query = query.eq("user_id", user.id) if user else query.eq("is_demo", True)
    return query.order("ingested_at", desc=True).execute().data


@router.get("/repos/{repo_id}/status")
def get_repo_status(repo_id: str, user: OptionalUser):
    return get_repo_for(repo_id, user)


@router.delete("/repos/{repo_id}")
def delete_repo(repo_id: str, user: RequiredUser):
    # 404 unless the repo is YOURS. The shared demo has no owner, so nobody
    # can delete it through the API.
    get_repo_for(repo_id, user)

    # Delete related rows first (chunks, queries), then the repo itself.
    supabase.table("chunks").delete().eq("repo_id", repo_id).execute()
    supabase.table("queries").delete().eq("repo_id", repo_id).execute()
    supabase.table("repos").delete().eq("id", repo_id).execute()

    # Clean up extracted files on disk.
    repo_path = REPOS_DIR / repo_id
    shutil.rmtree(repo_path, ignore_errors=True)

    return {"deleted": repo_id}

@router.get("/repos/{repo_id}/file")
def get_repo_file(repo_id: str, path: str, user: OptionalUser):
    """
    Return one source file from an extracted repo so the UI can show a
    citation in context. `path` is user-controlled input — treat it as hostile.
    """
    # 1. The caller must be allowed to see this repo at all. This also checks
    #    that repo_id is a real UUID, so it can never smuggle in "../".
    get_repo_for(repo_id, user)

    # Reject null bytes before touching the filesystem. Depending on the
    # platform, Path.resolve() may leave them intact and is_file() then
    # reports a missing file instead of treating the request as invalid.
    if "\x00" in path:
        raise HTTPException(status_code=400, detail="Invalid path")

    extract_path = REPOS_DIR / repo_id
    if not extract_path.is_dir():
        raise HTTPException(status_code=404, detail="Repo not found")

    try:
        root = find_repo_root(extract_path).resolve()
        # 2. resolve() collapses "..", follows symlinks and handles absolute
        #    paths ("/etc/passwd" replaces `root` entirely in pathlib).
        target = (root / path).resolve()
    except (ValueError, OSError):  # e.g. an embedded null byte
        raise HTTPException(status_code=400, detail="Invalid path")

    # 3. The real check: the fully-resolved target must still live inside
    #    the repo. is_relative_to compares whole path segments, unlike a
    #    string startswith ("/data/abc" would wrongly match "/data/abc-evil").
    if not target.is_relative_to(root):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    if target.stat().st_size > MAX_PREVIEW_BYTES:
        raise HTTPException(status_code=413, detail="File too large to preview")

    content = target.read_text(encoding="utf-8", errors="replace")
    return {
        "path": path,
        "content": content,
        "line_count": content.count("\n") + 1,
    }
