# Acme Notes

A small notes service used as the demo repository for Signal. It has a Python
API (`server/`) and a TypeScript client (`web/`), and is deliberately compact so
you can ask questions about all of it.

## What it does

- Users register with an email and password, then log in to receive an access token.
- Each user can create, read, update, delete, pin and search their own notes.
- Notes are private: a user can never read or change another user's notes.
- Every authenticated request is rate limited per user.

## Architecture

```
web/  (TypeScript)  ->  server/main.py (FastAPI routes)
                            |-- auth.py       passwords and tokens
                            |-- notes.py      note CRUD with ownership checks
                            |-- search.py     relevance ranking
                            |-- ratelimit.py  token bucket per user
                            '-- db.py         SQLite connection helper
```

## Security notes

Passwords are never stored. Only a salted PBKDF2 hash is kept, and comparisons
use a constant-time function. Access tokens are signed with HMAC-SHA256, expire
after 30 minutes by default, and are verified on every request.

Looking up a note that belongs to someone else behaves exactly like looking up a
note that does not exist, so note ids cannot be probed.

## Configuration

Settings come from environment variables and are read once in `server/config.py`:
`ACME_SECRET_KEY`, `ACME_TOKEN_MINUTES`, `ACME_RATE_LIMIT` and `ACME_DB`.

## Running the tests

Run `pytest server/tests` from the repository root.
