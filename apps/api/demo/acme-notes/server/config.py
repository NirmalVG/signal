"""Runtime configuration, read once from environment variables."""
import os
from dataclasses import dataclass


@dataclass
class Settings:
    secret_key: str = os.environ.get("ACME_SECRET_KEY", "dev-only-change-me")
    access_token_minutes: int = int(os.environ.get("ACME_TOKEN_MINUTES", "30"))
    password_iterations: int = 200_000
    rate_limit_per_minute: int = int(os.environ.get("ACME_RATE_LIMIT", "60"))
    max_title_length: int = 120
    max_note_length: int = 10_000
    database_path: str = os.environ.get("ACME_DB", "notes.db")


settings = Settings()
