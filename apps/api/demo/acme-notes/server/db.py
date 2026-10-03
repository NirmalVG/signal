"""A tiny SQLite helper: one short-lived connection per unit of work."""
import sqlite3
from contextlib import contextmanager

from .config import settings

SCHEMA = """
create table if not exists users (
    id            integer primary key autoincrement,
    email         text unique not null,
    password_hash text not null,
    created_at    text not null default current_timestamp
);

create table if not exists notes (
    id         integer primary key autoincrement,
    owner_id   integer not null references users(id) on delete cascade,
    title      text not null,
    body       text not null,
    pinned     integer not null default 0,
    updated_at text not null default current_timestamp
);

create index if not exists notes_owner_idx on notes(owner_id);
"""


@contextmanager
def connect():
    """Yield a connection that commits on success and rolls back on any error."""
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys = on")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
