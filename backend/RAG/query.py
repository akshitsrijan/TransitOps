"""
query.py

Routes an incoming user query to one of three retrieval paths:
    1. RAG only      -> unstructured document chunks
    2. MySQL only     -> structured database records
    3. Hybrid          -> both, merged into a single context object

No LLM is called anywhere in this module. Classification is done with
deterministic keyword/regex heuristics. Retrieval functions are written
against small Protocol interfaces so you can plug in your real vector
store and MySQL client without touching the routing logic.

Confidence note: keyword-based routing will misclassify genuinely
ambiguous queries (e.g. "explain why revenue dropped last quarter" mixes
an analytical/RAG-style verb with a structured aggregate). The
classifier below scores signals instead of doing simple if/else so you
get a confidence number to threshold on, but it is not a substitute for
a learned or LLM-based router if accuracy matters more than latency/cost.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Iterable, Protocol


# --------------------------------------------------------------------------
# Intent types
# --------------------------------------------------------------------------

class QueryIntent(str, Enum):
    RAG = "RAG"
    MYSQL = "MYSQL"
    HYBRID = "HYBRID"


# --------------------------------------------------------------------------
# Classification
# --------------------------------------------------------------------------

# Signals that suggest the query wants structured/aggregate data from a DB.
_SQL_PATTERNS = [
    r"\bhow many\b",
    r"\bcount of\b",
    r"\btotal\b",
    r"\bsum of\b",
    r"\baverage\b",
    r"\bavg\b",
    r"\blist all\b",
    r"\btop \d+\b",
    r"\bgroup by\b",
    r"\bbetween \d{4} and \d{4}\b",
    r"\brevenue\b",
    r"\border(s)?\b",
    r"\bcustomer(s)?\b",
    r"\btable\b",
    r"\brecord(s)?\b",
    r"\bdate range\b",
    r"\bgreater than\b",
    r"\bless than\b",
]

# Signals that suggest the query wants unstructured/semantic document content.
_RAG_PATTERNS = [
    r"\bwhat is\b",
    r"\bwhat are\b",
    r"\bexplain\b",
    r"\bdescribe\b",
    r"\bwhy\b",
    r"\bsummarize\b",
    r"\bsummary of\b",
    r"\bhow does\b",
    r"\bhow do\b",
    r"\baccording to\b",
    r"\bpolicy\b",
    r"\bdocument(ation)?\b",
    r"\bmanual\b",
    r"\bguide\b",
    r"\bcompare\b",
]

_SQL_RE = [re.compile(p, re.IGNORECASE) for p in _SQL_PATTERNS]
_RAG_RE = [re.compile(p, re.IGNORECASE) for p in _RAG_PATTERNS]


@dataclass
class ClassificationResult:
    intent: QueryIntent
    confidence: float  # 0.0 - 1.0, relative strength of the winning signal
    sql_signal_hits: list[str] = field(default_factory=list)
    rag_signal_hits: list[str] = field(default_factory=list)


def classify_query(query: str) -> ClassificationResult:
    """
    Deterministic, LLM-free classifier.

    Counts regex hits for SQL-style and RAG-style signals. If both fire,
    it's HYBRID. If only one fires, that's the route. If neither fires,
    defaults to RAG (safer fallback: unstructured search over silence).
    """
    sql_hits = [p.pattern for p in _SQL_RE if p.search(query)]
    rag_hits = [p.pattern for p in _RAG_RE if p.search(query)]

    total = len(sql_hits) + len(rag_hits)

    if sql_hits and rag_hits:
        intent = QueryIntent.HYBRID
        confidence = min(1.0, total / 4)
    elif sql_hits:
        intent = QueryIntent.MYSQL
        confidence = min(1.0, len(sql_hits) / 3)
    elif rag_hits:
        intent = QueryIntent.RAG
        confidence = min(1.0, len(rag_hits) / 3)
    else:
        intent = QueryIntent.RAG
        confidence = 0.2  # low-confidence fallback, no signals matched

    return ClassificationResult(
        intent=intent,
        confidence=round(confidence, 2),
        sql_signal_hits=sql_hits,
        rag_signal_hits=rag_hits,
    )


# --------------------------------------------------------------------------
# Retrieval interfaces (swap these for your real implementations)
# --------------------------------------------------------------------------

class VectorStore(Protocol):
    """Minimal interface your real vector store client should satisfy."""

    def search(self, query: str, top_k: int = 5) -> Iterable[dict[str, Any]]:
        """Return an iterable of {"id", "text", "score", "metadata"} dicts."""
        ...


class MySQLConnector(Protocol):
    """Minimal interface your real MySQL client should satisfy."""

    def query(self, query: str) -> Iterable[dict[str, Any]]:
        """
        Given the natural-language query, return an iterable of row dicts.
        In a real implementation this would translate `query` into SQL
        (via a fixed template, a query-builder, or a NL2SQL layer) and
        execute it against the database. That translation step is NOT
        implemented here since it's out of scope for a router module.
        """
        ...


class _StubVectorStore:
    """
    Placeholder so this module runs standalone. Replace with a real
    client (Chroma, FAISS, Pinecone, Milvus, etc.) at wiring time.
    """

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        return [
            {
                "id": "stub-chunk-1",
                "text": f"[STUB] Document chunk relevant to: {query!r}",
                "score": 0.0,
                "metadata": {"source": "stub_vector_store"},
            }
        ]


class _StubMySQLConnector:
    """
    Placeholder so this module runs standalone. Replace with a real
    connection (mysql-connector-python, PyMySQL, SQLAlchemy, etc.)
    at wiring time.
    """

    def query(self, query: str) -> list[dict[str, Any]]:
        return [
            {
                "id": "stub-record-1",
                "data": f"[STUB] DB record relevant to: {query!r}",
                "source": "stub_mysql",
            }
        ]


# --------------------------------------------------------------------------
# Retrieval functions
# --------------------------------------------------------------------------

def retrieve_rag_chunks(
    query: str, vector_store: VectorStore | None = None, top_k: int = 5
) -> list[dict[str, Any]]:
    store = vector_store or _StubVectorStore()
    return list(store.search(query, top_k=top_k))


def retrieve_mysql_records(
    query: str, mysql_connector: MySQLConnector | None = None
) -> list[dict[str, Any]]:
    connector = mysql_connector or _StubMySQLConnector()
    return list(connector.query(query))


def merge_context(
    rag_chunks: list[dict[str, Any]], db_records: list[dict[str, Any]]
) -> dict[str, Any]:
    """Combine both retrieval results into a single context object."""
    return {
        "document_chunks": rag_chunks,
        "database_records": db_records,
        "chunk_count": len(rag_chunks),
        "record_count": len(db_records),
    }


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------

def process_query(
    query: str,
    vector_store: VectorStore | None = None,
    mysql_connector: MySQLConnector | None = None,
) -> dict[str, Any]:
    """
    Full pipeline: classify -> retrieve -> merge -> structured JSON-ready dict.
    No LLM call happens at any point in this function.
    """
    classification = classify_query(query)

    result: dict[str, Any] = {
        "query": query,
        "intent": classification.intent.value,
        "confidence": classification.confidence,
        "signals": {
            "sql": classification.sql_signal_hits,
            "rag": classification.rag_signal_hits,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if classification.intent == QueryIntent.RAG:
        chunks = retrieve_rag_chunks(query, vector_store)
        result["context"] = {"document_chunks": chunks, "chunk_count": len(chunks)}

    elif classification.intent == QueryIntent.MYSQL:
        records = retrieve_mysql_records(query, mysql_connector)
        result["context"] = {"database_records": records, "record_count": len(records)}

    else:  # HYBRID
        chunks = retrieve_rag_chunks(query, vector_store)
        records = retrieve_mysql_records(query, mysql_connector)
        result["context"] = merge_context(chunks, records)

    return result


def process_query_json(
    query: str,
    vector_store: VectorStore | None = None,
    mysql_connector: MySQLConnector | None = None,
    indent: int = 2,
) -> str:
    """Convenience wrapper returning a JSON string instead of a dict."""
    return json.dumps(
        process_query(query, vector_store, mysql_connector), indent=indent
    )


# --------------------------------------------------------------------------
# CLI smoke test
# --------------------------------------------------------------------------

if __name__ == "__main__":
    test_queries = [
        "What is our refund policy?",
        "How many orders were placed last month?",
        "Explain why revenue dropped and show me the total for Q1",
    ]
    for q in test_queries:
        print(process_query_json(q))
        print("-" * 60)