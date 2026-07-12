"""
Centralized application configuration.

Uses pydantic-settings so that all environment variables are:
- loaded once
- validated on startup (fail fast if something is missing/wrong)
- typed and auto-completed everywhere they're used

Import the single `settings` instance anywhere in the app instead of
calling os.getenv() directly. This keeps configuration in one place
and makes testing easier (settings can be overridden/mocked).
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "TransitOps"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    DATABASE_URL: Optional[str] = None  # explicit override, optional

    # --- SQLAlchemy engine tuning ---
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # --- Security ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --- CORS ---
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        # Allows either a JSON list in .env or a comma-separated string
        if isinstance(v, str) and not v.startswith("["):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def sqlalchemy_database_uri(self) -> str:
        """
        Builds the SQLAlchemy connection string for MySQL + PyMySQL.
        If DATABASE_URL is explicitly set, it takes priority (useful for
        Docker/CI environments that inject a full DSN).
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings accessor. lru_cache ensures the .env file is parsed
    only once per process, and the same Settings instance is reused
    (important for consistent config + easy dependency-injection in FastAPI).
    """
    return Settings()


settings = get_settings()
