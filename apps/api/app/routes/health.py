from fastapi import APIRouter
from app.core.supabase import supabase

router = APIRouter()

@router.get("/health")
def health_check():
    result = supabase.table("repos").select("id").limit(1).execute()
    return {"status": "ok", "db_reachable": True, "sample_count": len(result.data)}