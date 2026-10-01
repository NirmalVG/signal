# Place this file at: apps/api/app/routes/repos.py

import shutil
from pathlib import Path
import uuid

from fastapi import APIRouter, HTTPException

from app.core.supabase import supabase
from app.routes.ingest import find_repo_root 

router = APIRouter()

REPOS_DIR = Path("data/repos")
MAX_PREVIEW_BYTES = 1024 * 1024


@router.get("/repos")
def list_repos():
    result = (
        supabase.table("repos")
        .select("*")
        .order("ingested_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/repos/{repo_id}/status")
def get_repo_status(repo_id: str):
    result = supabase.table("repos").select("*").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")
    return result.data[0]


@router.delete("/repos/{repo_id}")
def delete_repo(repo_id: str):
    # Verify the repo exists before doing anything destructive.
    result = supabase.table("repos").select("id").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")

    # Delete related rows first (chunks, queries), then the repo itself.
    supabase.table("chunks").delete().eq("repo_id", repo_id).execute()
    supabase.table("queries").delete().eq("repo_id", repo_id).execute()
    supabase.table("repos").delete().eq("id", repo_id).execute()

    # Clean up extracted files on disk.
    repo_path = REPOS_DIR / repo_id
    shutil.rmtree(repo_path, ignore_errors=True)

    return {"deleted": repo_id}

@router.get("/repos/{repo_id}/file")
def get_repo_file(repo_id: str, path: str):
    """
    Return one source file from an extracted repo so the UI can show a
    citation in context. `path` is user-controlled input — treat it as hostile.
    """
    # 1. repo_id must be a real UUID, so it can never smuggle in "../".
    try:
        uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Repo not found")

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
