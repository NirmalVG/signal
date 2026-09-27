# Place this file at: apps/api/app/routes/repos.py

from fastapi import APIRouter, HTTPException

from app.core.supabase import supabase

router = APIRouter()


@router.get("/repos/{repo_id}/status")
def get_repo_status(repo_id: str):
    result = supabase.table("repos").select("*").eq("id", repo_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Repo not found")
    return result.data[0]