from fastapi import APIRouter

from app.core.auth import RequiredUser

router = APIRouter()


@router.get("/me")
def read_me(user: RequiredUser):
    """Who does the server think I am? Handy for debugging the auth flow."""
    return {"id": user.id, "email": user.email}