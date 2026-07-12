import pickle
from pathlib import Path

import chromadb
import ollama
from rank_bm25 import BM25Okapi

from app.config import settings
from app.rag.chunking import Chunk, chunk_markdown

_COLLECTION_NAME = "transitops_policy"
_BM25_PATH = Path(settings.chroma_persist_dir) / "bm25.pkl"


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in text.replace("/", " ").split() if t.isalnum() or any(c.isalnum() for c in t)]


def _load_chunks() -> list[Chunk]:
    corpus_dir = Path(__file__).resolve().parent.parent.parent / settings.rag_corpus_dir
    chunks: list[Chunk] = []
    for path in sorted(corpus_dir.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        chunks.extend(chunk_markdown(path.name, text))
    return chunks


def get_chroma_client() -> chromadb.ClientAPI:
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=settings.chroma_persist_dir)


def ensure_ingested() -> None:
    """Chunk + embed the policy corpus into Chroma and build a matching BM25
    index, but only if it hasn't been done already (persisted to disk, so this
    is a no-op on subsequent restarts)."""
    client = get_chroma_client()
    collection = client.get_or_create_collection(_COLLECTION_NAME)
    if collection.count() > 0 and _BM25_PATH.exists():
        return

    chunks = _load_chunks()
    if not chunks:
        return

    ollama_client = ollama.Client(host=settings.ollama_host)
    batch_size = 16
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        response = ollama_client.embed(model=settings.ollama_embed_model, input=[c.text for c in batch])
        collection.upsert(
            ids=[c.id for c in batch],
            embeddings=response.embeddings,
            documents=[c.text for c in batch],
            metadatas=[{"source": c.source, "heading": c.heading} for c in batch],
        )

    tokenized = [_tokenize(c.text) for c in chunks]
    bm25 = BM25Okapi(tokenized)
    _BM25_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_BM25_PATH, "wb") as f:
        pickle.dump({"bm25": bm25, "chunks": chunks}, f)


def load_bm25() -> tuple[BM25Okapi, list[Chunk]]:
    with open(_BM25_PATH, "rb") as f:
        data = pickle.load(f)
    return data["bm25"], data["chunks"]
