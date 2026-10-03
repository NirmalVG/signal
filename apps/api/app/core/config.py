from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    groq_api_key: str = ""
    signal_api_key: str = ""
    voyage_api_key: str = ""
    jina_api_key: str = ""
    # Comma-separated browser origins allowed to call this API (CORS).
    cors_origins: str = "http://localhost:3000"

    # --- Abuse protection (see app/core/protection.py) ---
    # How many reverse proxies sit in front of the API (Render/Railway/Fly = 1).
    # 0 means "trust nothing": use the TCP peer address and ignore X-Forwarded-For.
    trusted_proxy_hops: int = 0
    query_rate_per_minute: int = 10  # per client IP
    ingest_rate_per_hour: int = 3  # per client IP
    daily_query_limit: int = 500  # whole instance, resets at 00:00 UTC
    daily_ingest_limit: int = 20  # whole instance, resets at 00:00 UTC
    # Public-demo switch: when true, uploads and deletions are refused, so
    # strangers can query the pre-indexed repo but cannot change anything.
    read_only_mode: bool = False
    # Only for LEGACY Supabase projects that sign tokens with a shared secret
    # (HS256). Projects on asymmetric signing keys leave this empty.
    supabase_jwt_secret: str = ""

    class Config:
        env_file = ".env"

settings = Settings()