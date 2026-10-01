from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/config")
def get_public_config():
    """Non-secret flags the UI needs to adapt itself (e.g. hide upload in demo mode)."""
    return {"read_only": settings.read_only_mode}