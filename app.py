"""
app.py

FastAPI application exposing POST /chat.

Pipeline:
    User Query -> Hybrid Query -> Retriever -> Database -> LLM -> JSON Response

IMPORTANT — read before deploying:
- `Database` here is an in-memory placeholder (a Python list of documents seeded
  at startup). It does NOT persist and is NOT what you should run in production.
  Swap it for your real store (Postgres/pgvector, Chroma, Pinecone, Weaviate, etc.)
  by implementing the same interface (`get_all_documents`).
- `Retriever` implements hybrid search as BM25 (keyword) + TF-IDF cosine
  (semantic proxy) combined by a weighted score. This is NOT a real embedding
  model — no embedding model was specified in requirements. If you have one
  (OpenAI embeddings, sentence-transformers, etc.), swap `_semantic_scores`.
- The LLM stage reuses llm.py's `get_llm()`, which already enforces
  context-only answering (see llm.py). If llm.py is not in the same directory,
  this will fail to import.

Requires:
    pip install fastapi uvicorn rank_bm25 scikit-learn numpy --break-system-packages
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from llm import get_llm, UNAVAILABLE_MSG

try:
    from rank_bm25 import BM25Okapi
except ImportError as e:
    raise ImportError(
        "rank_bm25 not installed. Run: pip install rank_bm25 --break-system-packages"
    ) from e

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError as e:
    raise ImportError(
        "scikit-learn not installed. Run: pip install scikit-learn --break-system-packages"
    ) from e


# ---------------------------------------------------------------------------
# Database layer (placeholder — swap with a real store for production use)
# ---------------------------------------------------------------------------

class BaseDatabase(ABC):
    name: str = "base"

    @abstractmethod
    def get_all_documents(self) -> List[Dict[str, Any]]:
        ...


class InMemoryDatabase(BaseDatabase):
    """
    Placeholder document store. Each document:
        {"id": str, "text": str, "source": str}
    Replace with a real DB-backed implementation for production.
    """

    name = "in_memory"

    def __init__(self, documents: List[Dict[str, Any]] = None):
        self._documents = documents or self._seed_documents()

    @staticmethod
    def _seed_documents() -> List[Dict[str, Any]]:
        return [
            {
                "id": "doc1",
                "text": "The FastAPI framework is built on top of Starlette and Pydantic, "
                        "providing high performance and automatic OpenAPI documentation.",
                "source": "internal_docs/fastapi_overview.md",
            },
            {
                "id": "doc2",
                "text": "Hybrid search combines keyword-based retrieval (e.g. BM25) with "
                        "semantic vector search to improve recall and precision.",
                "source": "internal_docs/hybrid_search.md",
            },
            {
                "id": "doc3",
                "text": "This is placeholder seed data. Replace InMemoryDatabase with a "
                        "real database connector before production use.",
                "source": "internal_docs/README.md",
            },
        ]

    def get_all_documents(self) -> List[Dict[str, Any]]:
        return self._documents


# ---------------------------------------------------------------------------
# Retriever layer
# ---------------------------------------------------------------------------

class HybridRetriever:
    """
    Combines BM25 keyword scoring with TF-IDF cosine similarity as a semantic
    proxy. Scores are min-max normalized per method, then combined with
    `keyword_weight` / (1 - keyword_weight).
    """

    def __init__(self, database: BaseDatabase, keyword_weight: float = 0.5):
        self.database = database
        self.keyword_weight = keyword_weight
        self._documents = database.get_all_documents()
        self._corpus_tokens = [doc["text"].lower().split() for doc in self._documents]
        self._bm25 = BM25Okapi(self._corpus_tokens) if self._documents else None
        self._tfidf = TfidfVectorizer()
        self._tfidf_matrix = (
            self._tfidf.fit_transform([doc["text"] for doc in self._documents])
            if self._documents
            else None
        )

    @staticmethod
    def _normalize(scores: np.ndarray) -> np.ndarray:
        if scores.size == 0:
            return scores
        min_s, max_s = scores.min(), scores.max()
        if max_s - min_s < 1e-9:
            return np.zeros_like(scores)
        return (scores - min_s) / (max_s - min_s)

    def _keyword_scores(self, query: str) -> np.ndarray:
        if not self._bm25:
            return np.array([])
        return np.array(self._bm25.get_scores(query.lower().split()))

    def _semantic_scores(self, query: str) -> np.ndarray:
        if self._tfidf_matrix is None:
            return np.array([])
        query_vec = self._tfidf.transform([query])
        return cosine_similarity(query_vec, self._tfidf_matrix).flatten()

    def retrieve(self, hybrid_query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not self._documents:
            return []

        kw_scores = self._normalize(self._keyword_scores(hybrid_query))
        sem_scores = self._normalize(self._semantic_scores(hybrid_query))

        combined = (
            self.keyword_weight * kw_scores
            + (1 - self.keyword_weight) * sem_scores
        )

        ranked_idx = np.argsort(combined)[::-1][:top_k]
        results = []
        for idx in ranked_idx:
            if combined[idx] <= 0:
                continue
            doc = self._documents[idx]
            results.append({**doc, "score": float(combined[idx])})
        return results


# ---------------------------------------------------------------------------
# Hybrid query construction
# ---------------------------------------------------------------------------

def build_hybrid_query(raw_query: str) -> str:
    """
    Normalizes the raw user query into a form used for both BM25 and TF-IDF
    retrieval. Currently a light normalization pass; extend here if you need
    query expansion, synonym injection, or entity extraction.
    """
    return raw_query.strip()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Context-Grounded Chat API")

_database = InMemoryDatabase()
_retriever = HybridRetriever(_database)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User's question")


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    documents_used: List[str]
    database_used: str
    execution_time: float


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    start_time = time.perf_counter()

    if not request.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    hybrid_query = build_hybrid_query(request.query)
    retrieved_docs = _retriever.retrieve(hybrid_query, top_k=3)

    if not retrieved_docs:
        execution_time = time.perf_counter() - start_time
        return ChatResponse(
            answer=UNAVAILABLE_MSG,
            sources=[],
            documents_used=[],
            database_used=_database.name,
            execution_time=execution_time,
        )

    context = "\n\n".join(
        f"[{doc['id']}] {doc['text']}" for doc in retrieved_docs
    )

    llm = get_llm()
    answer = llm.answer(context, request.query)

    execution_time = time.perf_counter() - start_time

    return ChatResponse(
        answer=answer,
        sources=[doc["source"] for doc in retrieved_docs],
        documents_used=[doc["id"] for doc in retrieved_docs],
        database_used=_database.name,
        execution_time=execution_time,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)