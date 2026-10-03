"""HTTP routes. Each route does three things: authenticate, rate limit, then
call into notes/search, which enforce ownership themselves."""
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from . import notes, search
from .auth import AuthError, login, register, user_id_from_header
from .db import init_db
from .ratelimit import RateLimited, check_rate_limit

app = FastAPI(title="Acme Notes")
init_db()


class Credentials(BaseModel):
    email: str
    password: str


class NoteIn(BaseModel):
    title: str
    body: str = ""
    pinned: bool = False


def current_user(authorization: str | None = Header(default=None)) -> int:
    """Resolve the caller from the Authorization header and apply their rate limit."""
    try:
        user_id = user_id_from_header(authorization)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    try:
        check_rate_limit(f"user:{user_id}")
    except RateLimited as exc:
        raise HTTPException(
            status_code=429,
            detail=str(exc),
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc
    return user_id


@app.post("/register", status_code=201)
def register_route(credentials: Credentials):
    try:
        return {"id": register(credentials.email, credentials.password)}
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/login")
def login_route(credentials: Credentials):
    try:
        return {"token": login(credentials.email, credentials.password)}
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.get("/notes")
def list_notes_route(user_id: int = Depends(current_user)):
    return notes.list_notes(user_id)


@app.post("/notes", status_code=201)
def create_note_route(note: NoteIn, user_id: int = Depends(current_user)):
    try:
        return notes.create_note(user_id, note.title, note.body)
    except notes.InvalidNote as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/notes/{note_id}")
def get_note_route(note_id: int, user_id: int = Depends(current_user)):
    try:
        return notes.get_note(user_id, note_id)
    except notes.NotFound as exc:
        raise HTTPException(status_code=404, detail="Note not found") from exc


@app.put("/notes/{note_id}")
def update_note_route(note_id: int, note: NoteIn, user_id: int = Depends(current_user)):
    try:
        return notes.update_note(user_id, note_id, note.title, note.body, note.pinned)
    except notes.NotFound as exc:
        raise HTTPException(status_code=404, detail="Note not found") from exc
    except notes.InvalidNote as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.delete("/notes/{note_id}", status_code=204)
def delete_note_route(note_id: int, user_id: int = Depends(current_user)):
    try:
        notes.delete_note(user_id, note_id)
    except notes.NotFound as exc:
        raise HTTPException(status_code=404, detail="Note not found") from exc


@app.get("/search")
def search_route(q: str, user_id: int = Depends(current_user)):
    return search.search_notes(user_id, q)
