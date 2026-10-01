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

    class Config:
        env_file = ".env"

settings = Settings()