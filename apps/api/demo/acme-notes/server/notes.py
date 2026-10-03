"""Note storage. Every query is scoped to the owner, so ownership is enforced
here rather than being left to each route."""
from .config import settings
from .db import connect


class NotFound(Exception):
    """The note does not exist, or belongs to someone else (deliberately the same)."""


class InvalidNote(Exception):
    """The title or body is empty or too long."""


def _validate(title: str, body: str) -> None:
    if not title.strip():
        raise InvalidNote("A note needs a title")
    if len(title) > settings.max_title_length:
        raise InvalidNote(f"Titles are limited to {settings.max_title_length} characters")
    if len(body) > settings.max_note_length:
        raise InvalidNote(f"Notes are limited to {settings.max_note_length} characters")


def create_note(owner_id: int, title: str, body: str) -> dict:
    _validate(title, body)
    with connect() as conn:
        cursor = conn.execute(
            "insert into notes (owner_id, title, body) values (?, ?, ?)",
            (owner_id, title.strip(), body),
        )
        note_id = cursor.lastrowid
    return get_note(owner_id, note_id)


def list_notes(owner_id: int, limit: int = 50) -> list[dict]:
    """Pinned notes first, then the most recently updated."""
    with connect() as conn:
        rows = conn.execute(
            "select * from notes where owner_id = ? "
            "order by pinned desc, updated_at desc limit ?",
            (owner_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def get_note(owner_id: int, note_id: int) -> dict:
    with connect() as conn:
        row = conn.execute(
            "select * from notes where id = ? and owner_id = ?", (note_id, owner_id)
        ).fetchone()
    if row is None:
        raise NotFound(note_id)
    return dict(row)


def update_note(owner_id: int, note_id: int, title: str, body: str, pinned: bool) -> dict:
    _validate(title, body)
    with connect() as conn:
        cursor = conn.execute(
            "update notes set title = ?, body = ?, pinned = ?, "
            "updated_at = current_timestamp where id = ? and owner_id = ?",
            (title.strip(), body, int(pinned), note_id, owner_id),
        )
        if cursor.rowcount == 0:
            raise NotFound(note_id)
    return get_note(owner_id, note_id)


def delete_note(owner_id: int, note_id: int) -> None:
    with connect() as conn:
        cursor = conn.execute(
            "delete from notes where id = ? and owner_id = ?", (note_id, owner_id)
        )
        if cursor.rowcount == 0:
            raise NotFound(note_id)
