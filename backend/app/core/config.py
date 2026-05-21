from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Khayal Healthcare"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Production: set DATABASE_URL to full connection string (e.g. Supabase)
    # Local dev: uses individual POSTGRES_* fields below
    DATABASE_URL: Optional[str] = None
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "khayal_db"

    # Production: set REDIS_URL for Upstash (rediss://...)
    # Local dev: uses REDIS_HOST/REDIS_PORT below
    REDIS_URL: Optional[str] = None
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    FIREBASE_CREDENTIALS: Optional[str] = None

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    GROQ_API_KEY: Optional[str] = None

    OPENAI_API_KEY: Optional[str] = None

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://khayal-ai.vercel.app"]
    FRONTEND_URL: Optional[str] = None  # Vercel URL added to CORS in production

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
