from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/propflow"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Email
    RESEND_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@propflow.in"

    # App
    APP_NAME: str = "PropFlow"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
