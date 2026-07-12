# TransitOps — Retrieval Backend

Retrieval service for the TransitOps Transport Management System.

**Architectural note:** this service is **retrieval-only**. It does not call, host,
or depend on any LLM. It ingests documents, embeds them, indexes them, and serves
ranked, threshold-filtered, cited context in response to a query. Generation (turning
that context into a prose answer) is explicitly **out of scope** and left to whatever
consumes this service's output — this repo can be paired with any LLM (or none) at
the caller's discretion.

**Scope disclaimer:** this repo owns ingestion, embedding, indexing, and retrieval
only. Frontend and the CRUD backend are owned by other teams and are out of scope
here. Integration point with them is MySQL (operational data) and a shared API
contract for retrieval requests/responses.

## Why retrieval-only

- **No hallucination surface.** There's no generation step inside this service, so
  there's nothing here that can fabricate an answer. Every response is a set of
  retrieved, sourced, threshold-filtered chunks — not synthesized text.
- **Composable.** Any downstream system — an LLM, a rules engine, a human reviewing
  a dashboard — can consume the same retrieval output. The retriever doesn't assume
  or require a generation layer to exist.
- **Auditable.** Because output is retrieved chunks with citations rather than
  generated prose, every result is traceable back to a source document. Nothing to
  "explain away" — the evidence *is* the answer.
- **Cheaper to run and easier to test.** No LLM calls in the hot path means no
  token cost, no latency variance from a generation model, and deterministic
  retrieval behavior that's straightforward to unit test.

## Architecture

```
                ┌─────────────────────┐
                │  knowledge_base/    │   Markdown source documents
                │  (*.md)             │
                └──────────┬──────────┘
                           │ ingestion (chunk + embed)
                           ▼
                ┌─────────────────────┐
                │      ChromaDB       │   Vector store (persisted)
                └──────────┬──────────┘
                           │ similarity search (top-k, threshold-filtered)
                           ▼
                ┌─────────────────────┐
                │      Retriever       │   Grounded, cited context
                │  (this repo's job)   │   — no generation performed here
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │   API response       │   Ranked chunks + source citations
                │   (JSON, structured) │
                └──────────┬──────────┘
                           │  optional, external, caller's choice
                           ▼
                ┌─────────────────────┐
                │  Any LLM / consumer  │   Not part of this repo.
                │  (pluggable, or none)│   Can be swapped or omitted entirely.
                └─────────────────────┘

MySQL ── SQLAlchemy ── operational data (routes, drivers, vehicles, etc.)
         used to enrich/contextualize retrieval where relevant, owned by CRUD team.
```

**Grounding rule:** retrieved chunks below `SIMILARITY_THRESHOLD` are discarded.
If no chunk survives, the API returns an explicit "insufficient context" result —
an empty or low-confidence response — rather than ever attempting to fill the gap.
This is the entire hallucination-prevention mechanism: since this service never
generates text, it structurally cannot invent an answer. There is no prompt to
harden, no generation temperature to tune, no drift to monitor.

## Folder structure

```
transitops-rag/
├── app/
│   ├── config.py              # pydantic-settings, single source of truth for env vars
│   ├── main.py                # FastAPI app entrypoint (not yet generated)
│   ├── api/
│   │   └── routes/            # FastAPI routers (e.g. /query, /health)
│   ├── core/
│   │   ├── chunking.py        # markdown-aware chunking logic
│   │   ├── embeddings.py      # sentence-transformers wrapper
│   │   └── retriever.py       # ChromaDB query + threshold filtering + citation assembly
│   ├── db/
│   │   ├── mysql.py           # SQLAlchemy engine/session
│   │   └── models.py          # ORM models for operational data (read-mostly)
│   ├── ingestion/
│   │   └── loader.py          # reads knowledge_base/*.md, feeds chunking → embeddings
│   └── schemas/
│       └── query.py           # Pydantic request/response models (chunks + citations, no "answer" field)
├── knowledge_base/            # source Markdown documents (16 files currently)
├── chroma_db/                 # persisted vector store (gitignored)
├── scripts/
│   └── ingest.py              # one-off / re-run ingestion script
├── tests/
├── .env.example
├── .env                       # not committed
├── requirements.txt
└── README.md
```

Note there is no `core/llm.py` and no `LLM_*` module in this structure — that was
deliberately removed, not just left unimplemented. If a generation layer is ever
added back, it belongs in a separate service that consumes this API, not inside
this repo.

## Setup

```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# fill in MySQL credentials, etc. No LLM API key required.
```

## Environment variables

| Variable | Purpose |
|---|---|
| `MYSQL_*` | Connection to operational MySQL DB (owned by CRUD team) |
| `CHROMA_PERSIST_DIR` / `CHROMA_COLLECTION_NAME` | Vector store location and collection name |
| `KNOWLEDGE_BASE_DIR` | Path to source Markdown documents |
| `EMBEDDING_MODEL_NAME` / `EMBEDDING_DEVICE` | Sentence-Transformers model + inference device |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | Chunking parameters |
| `MAX_CHUNKS_PER_DOCUMENT` | Caps how many chunks from a single document can appear in one result set — needed because the knowledge base includes at least one outlier file (`FAQ_Document.md`, ~250KB) that would otherwise dominate top-k results |
| `TOP_K_RESULTS` / `SIMILARITY_THRESHOLD` | Retrieval tuning — threshold is the hallucination-prevention gate |

There is intentionally no `LLM_*` variable group. This service does not call an LLM.

## Consuming this service's output

Every retrieval response is a structured JSON payload of ranked chunks, each with:

- source document name and section
- similarity score
- raw retrieved text

There is no `answer` field. If you want prose generated from this context, that's
a separate, external step — this repo hands off grounded evidence, not a finished
response, and stays agnostic about what (if anything) turns that evidence into text.

## Known dataset note

The current `knowledge_base/` source set (`TransitOps_RAG_Benchmark_Dataset.zip`)
contains 16 Markdown files. One of them, `FAQ_Document.md`, is ~25x larger than
the next largest file. Ingestion and retrieval logic must account for this
(see `MAX_CHUNKS_PER_DOCUMENT`) — flagged here so it isn't rediscovered as a bug
later.

## Status

Scaffolding only. Ingestion pipeline, retriever, and API routes are not yet
implemented — pending next steps.
