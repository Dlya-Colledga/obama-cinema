from functools import lru_cache
from pathlib import Path
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # PostgreSQL Configuration
    POSTGRES_DB: str = "cinema_db"
    POSTGRES_USER: str = "cinema_user"
    POSTGRES_PASSWORD: str = "cinema_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str | None = None

    # Application Configuration
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_KEY: str = "cinema_super_secret_app_key_32_characters_minimum!"
    APP_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    # Authentication
    SESSION_LIFETIME_DAYS: int = 30

    # External Provider Configuration
    ANIXART_PRIMARY_URL: str = "https://api.anixsekai.com"
    ANIXART_FALLBACK_URL: str = "https://api-s.anixsekai.com"
    ANIXART_USER_AGENT: str = (
        "AnixartApp/10.0-26090418 (Android 14; SDK 34; x86_64; OnePlus NE2210; ru)"
    )

    model_config = SettingsConfigDict(
        env_file=(
            str(Path(__file__).resolve().parent.parent.parent.parent / ".env"),
            str(Path(__file__).resolve().parent.parent.parent / ".env"),
            ".env",
        ),
        extra="ignore",
    )

    @computed_field
    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            # If user provided postgresql:// or postgres://, convert to postgresql+asyncpg://
            url = self.DATABASE_URL
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1)
            return url
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field
    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgresql+asyncpg://"):
                return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+psycopg2://", 1)
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins(self) -> list[str]:
        origins = {
            self.FRONTEND_URL,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:8000",
        }
        return list(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()
