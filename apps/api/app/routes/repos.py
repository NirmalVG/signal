# Place this file at: apps/api/app/routes/repos.py

import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.supabase import supabase

router = APIRouter()

REPOS_DIR = Path("data/repos")


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