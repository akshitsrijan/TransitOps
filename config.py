"""
Central configuration for the TransitOps RAG backend.

Loads and validates all environment variables via pydantic-settings.
Import `settings` (singleton) everywhere instead of re-reading os.environ.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "TransitOps-RAG"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # --- MySQL ---
    MYSQL_HOST: str
    MYSQL_PORT: int = 3306
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    MYSQL_DB: str

    # --- ChromaDB ---
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION_NAME: str = "transitops_knowledge_base"

    # --- Knowledge base ---
    KNOWLEDGE_BASE_DIR: str = "./knowledge_base"

    # --- Embeddings ---
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DEVICE: str = "cpu"

    # --- Chunking ---
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 120
    MAX_CHUNKS_PER_DOCUMENT: int = 3

    # --- Retrieval ---
    TOP_K_RESULTS: int = 5
    SIMILARITY_THRESHOLD: float = 0.35

    # --- LLM ---
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str
    LLM_MODEL_NAME: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.0
    LLM_MAX_OUTPUT_TOKENS: int = 512

    # --- API ---
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def mysql_url(self) -> str:
        """SQLAlchemy connection string for MySQL (PyMySQL driver)."""
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )

    @property
    def knowledge_base_path(self) -> Path:
        return Path(self.KNOWLEDGE_BASE_DIR).resolve()

    @property
    def chroma_persist_path(self) -> Path:
        return Path(self.CHROMA_PERSIST_DIR).resolve()


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — import this, not Settings() directly."""
    return Settings()


settings = get_settings()
