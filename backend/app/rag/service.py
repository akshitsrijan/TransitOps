"""Hybrid (dense + sparse) retrieval over the TransitOps policy corpus, plus
deterministic confidence scoring. No LLM generation is involved anywhere in
this module — retrieval is embeddings (dense) + BM25 (sparse) fused by
reciprocal rank fusion, and scoring is rule-based against app.rag.rules
extractions. This keeps results fast and reproducible.
"""

from dataclasses import dataclass, field

import ollama

from app.config import settings
from app.rag.chunking import Chunk
from app.rag.ingest import get_chroma_client, load_bm25
from app.rag.rules import ExtractedRule, extract_rules

_RRF_K = 60
_MAX_POSSIBLE_RRF = 2 / (_RRF_K + 1)  # rank 1 in both dense and sparse lists


@dataclass
class RetrievedChunk:
    chunk: Chunk
    rrf_score: float


@dataclass
class RagResult:
    confidence: float
    verdict: str  # "Pass" | "Fail" | "Unverifiable"
    rationale: str
    citations: list[str] = field(default_factory=list)


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in text.replace("/", " ").split() if any(c.isalnum() for c in t)]


def hybrid_retrieve(query: str, top_k: int = settings.rag_top_k) -> list[RetrievedChunk]:
    client = get_chroma_client()
    collection = client.get_or_create_collection("transitops_policy")
    bm25, chunks = load_bm25()
    chunk_by_id = {c.id: c for c in chunks}

    candidate_pool = max(top_k * 4, 20)

    ollama_client = ollama.Client(host=settings.ollama_host)
    query_embedding = ollama_client.embed(model=settings.ollama_embed_model, input=[query]).embeddings[0]
    dense_result = collection.query(query_embeddings=[query_embedding], n_results=candidate_pool)
    dense_ids: list[str] = dense_result["ids"][0] if dense_result["ids"] else []

    bm25_scores = bm25.get_scores(_tokenize(query))
    sparse_ranked = sorted(range(len(chunks)), key=lambda i: bm25_scores[i], reverse=True)[:candidate_pool]
    sparse_ids = [chunks[i].id for i in sparse_ranked]

    rrf_scores: dict[str, float] = {}
    for rank, cid in enumerate(dense_ids):
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)
    for rank, cid in enumerate(sparse_ids):
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)

    ranked = sorted(rrf_scores.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
    return [RetrievedChunk(chunk=chunk_by_id[cid], rrf_score=score) for cid, score in ranked if cid in chunk_by_id]


def _normalized_relevance(retrieved: list[RetrievedChunk]) -> float:
    if not retrieved:
        return 0.0
    return min(1.0, retrieved[0].rrf_score / _MAX_POSSIBLE_RRF)


def _rules_from_retrieved(retrieved: list[RetrievedChunk], unit: str) -> list[tuple[ExtractedRule, RetrievedChunk]]:
    matches: list[tuple[ExtractedRule, RetrievedChunk]] = []
    for rc in retrieved:
        for rule in extract_rules(rc.chunk.text, rc.chunk.source, rc.chunk.heading):
            if rule.unit == unit:
                matches.append((rule, rc))
    return matches


def score_against_interval(
    query: str,
    delta_value: float | None,
    unit: str,
    top_k: int = settings.rag_top_k,
) -> RagResult:
    """Score a recurring-interval style value (e.g. km since last matching
    maintenance) against the closest 'every X <unit>' rule found in the corpus."""
    retrieved = hybrid_retrieve(query, top_k)
    relevance = _normalized_relevance(retrieved)
    citations = sorted({rc.chunk.source for rc in retrieved[:3]})

    interval_matches = [(r, rc) for r, rc in _rules_from_retrieved(retrieved, unit) if r.kind == "interval"]

    if not interval_matches:
        verdict = "Unverifiable"
        confidence = round(relevance * 0.6, 2)
        rationale = (
            "No explicit policy interval was found in the retrieved context for this maintenance type, "
            "so the entry can't be checked against a specific threshold."
            if retrieved
            else "No relevant policy context was retrieved for this entry."
        )
        return RagResult(confidence=confidence, verdict=verdict, rationale=rationale, citations=citations)

    rule, rc = interval_matches[0]
    if delta_value is None:
        confidence = round(relevance * 0.7, 2)
        verdict = "Unverifiable"
        rationale = (
            f'A relevant policy interval was found ("{rule.sentence}", {rc.chunk.source}) but there is no prior '
            "matching service on record to measure the interval against."
        )
        return RagResult(confidence=confidence, verdict=verdict, rationale=rationale, citations=citations)

    ratio = delta_value / rule.low if rule.low else 1.0
    if ratio <= 1.15:
        rule_score = 0.95
    elif ratio <= 1.5:
        rule_score = 0.55
    else:
        rule_score = max(0.1, 0.55 - (ratio - 1.5) * 0.2)

    confidence = round(0.35 * relevance + 0.65 * rule_score, 2)
    verdict = "Pass" if rule_score >= 0.5 else "Fail"
    rationale = (
        f'Per {rc.chunk.source} ("{rule.sentence}"): this service occurred {delta_value:,.0f} {unit} after the '
        f"previous matching service, against a policy interval of {rule.low:,.0f} {unit}."
    )
    return RagResult(confidence=confidence, verdict=verdict, rationale=rationale, citations=citations)


def score_relevance_only(query: str, top_k: int = settings.rag_top_k) -> RagResult:
    """Score how well a submission is grounded in the policy corpus at all,
    without a numeric threshold to check it against (e.g. cargo/route context)."""
    retrieved = hybrid_retrieve(query, top_k)
    relevance = _normalized_relevance(retrieved)
    citations = sorted({rc.chunk.source for rc in retrieved[:3]})

    if not retrieved or relevance < 0.15:
        return RagResult(
            confidence=round(relevance, 2),
            verdict="Unverifiable",
            rationale="No closely related guidance was found in the policy corpus for this entry.",
            citations=citations,
        )

    top = retrieved[0].chunk
    return RagResult(
        confidence=round(relevance, 2),
        verdict="Pass" if relevance >= 0.4 else "Unverifiable",
        rationale=f'Closest related policy guidance: "{top.heading}" in {top.source}.',
        citations=citations,
    )
