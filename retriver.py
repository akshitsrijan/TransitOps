"""
TransitOps RAG — Retriever module.

Embeds an incoming query and performs a top-k similarity search against the
ChromaDB collection populated by scripts/ingest.py. Applies a similarity
threshold gate so that irrelevant chunks are dropped before they ever reach
the LLM summarization layer — this is the primary defense against the LLM
fabricating answers from weak or unrelated context.

Usage:
    from app.core.retriever import get_retriever

    retriever = get_retriever()
    results = retriever.search("What is the fuel reimbursement policy?")
    for chunk in results:
        print(chunk.similarity_score, chunk.metadata["title"], chunk.text[:80])

NOTE ON CONFIG DIVERGENCE:
PRIMARY_EMBEDDING_MODEL / FALLBACK_EMBEDDING_MODEL are hardcoded to match
scripts/ingest.py (BAAI/bge-small-en-v1.5 -> all-MiniLM-L6-v2 fallback).
Query and document embeddings MUST come from the same model family, or
similarity scores become meaningless. If ingest.py's models change, this
file must change with it.
"""

from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    print(
        "FATAL: chromadb is not installed. Run `pip install -r requirements.txt`.",
        file=sys.stderr,
    )
    raise

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print(
        "FATAL: sentence-transformers is not installed. Run `pip install -r requirements.txt`.",
        file=sys.stderr,
    )
    raise

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import settings

logger = logging.getLogger("transitops.retriever")

# --------------------------------------------------------------------------
# Must match scripts/ingest.py — see NOTE ON CONFIG DIVERGENCE above.
# --------------------------------------------------------------------------
PRIMARY_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
FALLBACK_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "

DEFAULT_TOP_K = 5


@dataclass
class RetrievedChunk:
    text: str
    metadata: dict = field(default_factory=dict)
    similarity_score: float = 0.0
    distance: float = 0.0

    def as_dict(self) -> dict:
        return asdict(self)


class RetrieverConnectionError(RuntimeError):
    """Raised when the retriever cannot connect to ChromaDB or load an embedding model."""


class Retriever:
    """
    Thin, stateful wrapper around a ChromaDB collection + embedding model.
    Intended to be constructed once (see get_retriever()) and reused across requests.
    """

    def __init__(
        self,
        persist_dir: Optional[Path] = None,
        collection_name: Optional[str] = None,
        embedding_device: Optional[str] = None,
    ):
        self._persist_dir = Path(persist_dir) if persist_dir else settings.chroma_persist_path
        self._collection_name = collection_name or settings.CHROMA_COLLECTION_NAME
        self._device = embedding_device or settings.EMBEDDING_DEVICE

        self._client = None
        self._collection = None
        self._model: Optional[SentenceTransformer] = None
        self._model_name_used: Optional[str] = None

        self._connect()
        self._load_embedding_model()

    # ---------------------------------------------------------------- #
    # Setup
    # ---------------------------------------------------------------- #
    def _connect(self) -> None:
        try:
            self._client = chromadb.PersistentClient(
                path=str(self._persist_dir),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_collection(name=self._collection_name)
            count = self._collection.count()
            logger.info(
                "Connected to Chroma collection '%s' (%d chunks) at %s",
                self._collection_name, count, self._persist_dir,
            )
            if count == 0:
                logger.warning(
                    "Collection '%s' is connected but empty — has ingestion been run?",
                    self._collection_name,
                )
        except Exception as exc:
            logger.critical(
                "Failed to connect to Chroma collection '%s' at %s: %s",
                self._collection_name, self._persist_dir, exc,
            )
            raise RetrieverConnectionError(
                f"Could not connect to ChromaDB collection '{self._collection_name}' "
                f"at '{self._persist_dir}'. Has scripts/ingest.py been run?"
            ) from exc

    def _load_embedding_model(self) -> None:
        try:
            logger.info("Loading query embedding model '%s'", PRIMARY_EMBEDDING_MODEL)
            self._model = SentenceTransformer(PRIMARY_EMBEDDING_MODEL, device=self._device)
            self._model_name_used = PRIMARY_EMBEDDING_MODEL
            logger.info("Loaded primary embedding model '%s'", PRIMARY_EMBEDDING_MODEL)
            return
        except Exception as exc:
            logger.warning(
                "Failed to load primary embedding model '%s' (%s). Falling back to '%s'.",
                PRIMARY_EMBEDDING_MODEL, exc, FALLBACK_EMBEDDING_MODEL,
            )

        try:
            self._model = SentenceTransformer(FALLBACK_EMBEDDING_MODEL, device=self._device)
            self._model_name_used = FALLBACK_EMBEDDING_MODEL
            logger.info("Loaded fallback embedding model '%s'", FALLBACK_EMBEDDING_MODEL)
        except Exception as exc:
            logger.critical("Failed to load fallback embedding model '%s': %s", FALLBACK_EMBEDDING_MODEL, exc)
            raise RetrieverConnectionError(
                f"Could not load either '{PRIMARY_EMBEDDING_MODEL}' or fallback "
                f"'{FALLBACK_EMBEDDING_MODEL}'."
            ) from exc

    # ---------------------------------------------------------------- #
    # Query
    # ---------------------------------------------------------------- #
    def _embed_query(self, query: str) -> list[float]:
        # Only the primary BGE model is asymmetric and needs the instruction prefix.
        # The MiniLM fallback is symmetric and should NOT be prefixed.
        text = (
            f"{BGE_QUERY_INSTRUCTION}{query}"
            if self._model_name_used == PRIMARY_EMBEDDING_MODEL
            else query
        )
        embedding = self._model.encode([text], convert_to_numpy=True, show_progress_bar=False)[0]
        return embedding.tolist()

    def search(
        self,
        query: str,
        top_k: int = DEFAULT_TOP_K,
        similarity_threshold: Optional[float] = None,
    ) -> list[RetrievedChunk]:
        """
        Return up to `top_k` chunks for `query`, sorted by descending similarity,
        filtered to those at or above `similarity_threshold` (defaults to
        settings.SIMILARITY_THRESHOLD). Returns [] on any failure or when no
        chunk clears the threshold — callers must treat [] as "no grounded
        answer possible" rather than retry logic.
        """
        if not isinstance(query, str) or not query.strip():
            logger.warning("Empty or invalid query received; returning no results.")
            return []

        if top_k <= 0:
            logger.warning("Non-positive top_k=%r requested; returning no results.", top_k)
            return []

        threshold = settings.SIMILARITY_THRESHOLD if similarity_threshold is None else similarity_threshold
        query = query.strip()

        try:
            query_embedding = self._embed_query(query)
        except Exception as exc:
            logger.error("Failed to embed query %r: %s", query, exc, exc_info=True)
            return []

        try:
            raw_results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error("ChromaDB query failed for %r: %s", query, exc, exc_info=True)
            return []

        documents = (raw_results.get("documents") or [[]])[0]
        metadatas = (raw_results.get("metadatas") or [[]])[0]
        distances = (raw_results.get("distances") or [[]])[0]

        if not documents:
            logger.info("No chunks found in collection for query: %r", query)
            return []

        results: list[RetrievedChunk] = []
        for doc_text, meta, distance in zip(documents, metadatas, distances):
            # Collection is created with hnsw:space="cosine", where Chroma reports
            # cosine DISTANCE (0 = identical). Convert to a similarity in [0, 1].
            similarity = max(0.0, min(1.0, 1.0 - float(distance)))
            if similarity < threshold:
                continue
            results.append(
                RetrievedChunk(
                    text=doc_text,
                    metadata=meta or {},
                    similarity_score=round(similarity, 4),
                    distance=round(float(distance), 4),
                )
            )

        if not results:
            logger.warning(
                "All %d retrieved chunk(s) fell below similarity threshold %.2f for query: %r",
                len(documents), threshold, query,
            )
        else:
            logger.info(
                "Retrieved %d/%d chunk(s) above threshold %.2f for query: %r",
                len(results), len(documents), threshold, query,
            )

        return results

    @property
    def embedding_model_in_use(self) -> str:
        return self._model_name_used or "unloaded"

    @property
    def collection_size(self) -> int:
        try:
            return self._collection.count()
        except Exception as exc:
            logger.error("Failed to get collection count: %s", exc)
            return -1


# --------------------------------------------------------------------------
# Module-level singleton — avoids reloading the embedding model per request.
# --------------------------------------------------------------------------
_retriever_singleton: Optional[Retriever] = None


def get_retriever() -> Retriever:
    """Lazily construct and cache a single Retriever instance for the process."""
    global _retriever_singleton
    if _retriever_singleton is None:
        _retriever_singleton = Retriever()
    return _retriever_singleton


# --------------------------------------------------------------------------
# CLI smoke test: `python -m app.core.retriever "your question here"`
# --------------------------------------------------------------------------
def _configure_cli_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def main() -> int:
    _configure_cli_logging()
    parser = argparse.ArgumentParser(description="Query the TransitOps knowledge base retriever")
    parser.add_argument("query", type=str, help="Natural language query")
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K)
    parser.add_argument("--threshold", type=float, default=None)
    args = parser.parse_args()

    try:
        retriever = get_retriever()
    except RetrieverConnectionError as exc:
        logger.critical("%s", exc)
        return 1

    results = retriever.search(args.query, top_k=args.top_k, similarity_threshold=args.threshold)
    if not results:
        print("No relevant chunks found.")
        return 0

    for i, chunk in enumerate(results, start=1):
        print(f"\n[{i}] score={chunk.similarity_score:.4f}  "
              f"title={chunk.metadata.get('title')!r}  section={chunk.metadata.get('section')!r}")
        print(chunk.text[:300])
    return 0


if __name__ == "__main__":
    sys.exit(main())
