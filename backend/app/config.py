from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/transitops.db"

    ollama_host: str = "http://localhost:11434"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_chat_model: str = "llama3.2:1b-instruct-q4_K_M"

    rag_corpus_dir: str = "../TransitOps_RAG_Benchmark_Dataset"
    chroma_persist_dir: str = "./data/chroma"
    rag_top_k: int = 5
    rag_confidence_threshold: float = 0.5

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
