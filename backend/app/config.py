from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/transitops.db"

    # SMTP for real OTP email delivery. Leave smtp_user/smtp_password empty to
    # disable real sending — the frontend falls back to its sandbox email toast.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "TransitOps Security"

    ollama_host: str = "http://localhost:11434"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_chat_model: str = "llama3.2:1b-instruct-q4_K_M"

    rag_corpus_dir: str = "../TransitOps_RAG_Benchmark_Dataset"
    chroma_persist_dir: str = "./data/chroma"
    rag_top_k: int = 5
    rag_confidence_threshold: float = 0.5

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
