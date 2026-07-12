"""
TransitOps RAG — Knowledge Base Ingestion Script.

Reads all Markdown files recursively from knowledge_base/, splits them into
overlapping chunks along markdown section boundaries, embeds each chunk with
BAAI/bge-small-en-v1.5 (falling back to all-MiniLM-L6-v2 if unavailable), and
stores the results in a persistent ChromaDB collection.

Usage:
    python scripts/ingest.py
    python scripts/ingest.py --reset                 # wipe collection before ingesting
    python scripts/ingest.py --kb-dir ./other_docs    # override source directory

NOTE ON CONFIG DIVERGENCE:
CHUNK_SIZE / CHUNK_OVERLAP / PRIMARY_EMBEDDING_MODEL below are hardcoded per the
ingestion spec (600 / 100 / BAAI/bge-small-en-v1.5) and intentionally do NOT read
from app.config.settings, because settings currently holds different defaults
(800 / 120 / all-MiniLM-L6-v2). Reconcile .env / config.py separately if you want
a single source of truth.
"""

from __future__ import annotations

import argparse
import logging
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# Ensure project root is importable when running as `python scripts/ingest.py`
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from app.config import settings
except Exception as exc:  # pragma: no cover
    print(f"FATAL: could not load app.config.settings: {exc}", file=sys.stderr)
    sys.exit(1)

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    print(
        "FATAL: chromadb is not installed. Run `pip install -r requirements.txt`.",
        file=sys.stderr,
    )
    sys.exit(1)

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print(
        "FATAL: sentence-transformers is not installed. Run `pip install -r requirements.txt`.",
        file=sys.stderr,
    )
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:  # progress bar is a nicety, not a hard requirement
    def tqdm(iterable, **kwargs):
        return iterable


# --------------------------------------------------------------------------
# Ingestion parameters (see NOTE ON CONFIG DIVERGENCE above)
# --------------------------------------------------------------------------
CHUNK_SIZE = 600
CHUNK_OVERLAP = 100
PRIMARY_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
FALLBACK_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_BATCH_SIZE = 32
MAX_LOOKAHEAD_FOR_WORD_BOUNDARY = 50  # chars to search for a clean word break

HEADER_PATTERN = re.compile(r"^(#{1,6})\s+(.*)")

logger = logging.getLogger("transitops.ingest")


# --------------------------------------------------------------------------
# Logging setup
# --------------------------------------------------------------------------
def setup_logging() -> None:
    log_dir = PROJECT_ROOT / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "ingest.log"

    level_name = getattr(settings, "LOG_LEVEL", "INFO")
    level = getattr(logging, str(level_name).upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)

    root_logger = logging.getLogger("transitops")
    root_logger.setLevel(level)
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)


# --------------------------------------------------------------------------
# Data structures
# --------------------------------------------------------------------------
@dataclass
class ChunkRecord:
    id: str
    text: str
    metadata: dict = field(default_factory=dict)


@dataclass
class IngestStats:
    files_found: int = 0
    files_ok: int = 0
    files_failed: int = 0
    files_skipped_empty: int = 0
    chunks_added: int = 0
    failed_files: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------
# Markdown parsing / chunking
# --------------------------------------------------------------------------
def discover_markdown_files(root: Path) -> list[Path]:
    if not root.exists():
        raise FileNotFoundError(f"Knowledge base directory does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Knowledge base path is not a directory: {root}")
    files = sorted(p for p in root.rglob("*.md") if p.is_file())
    return files


def extract_title(text: str, fallback: str) -> str:
    """Use the first H1 heading as the title; fall back to a prettified filename."""
    match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return fallback


def split_into_sections(text: str) -> list[tuple[str, str]]:
    """
    Split markdown text into (heading, body) pairs based on ATX headers (#..######).
    Content before the first header is grouped under 'Introduction'.
    Empty sections are dropped.
    """
    lines = text.splitlines()
    sections: list[tuple[str, str]] = []
    current_heading = "Introduction"
    current_body: list[str] = []

    for line in lines:
        match = HEADER_PATTERN.match(line)
        if match:
            if current_body:
                sections.append((current_heading, "\n".join(current_body).strip()))
            current_heading = match.group(2).strip() or current_heading
            current_body = []
        else:
            current_body.append(line)

    if current_body:
        sections.append((current_heading, "\n".join(current_body).strip()))

    return [(heading, body) for heading, body in sections if body.strip()]


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Sliding-window chunking with a soft word-boundary adjustment so chunks don't
    routinely split mid-word. Not a hard guarantee for pathological inputs
    (e.g. no whitespace at all), which is acceptable for prose documents.
    """
    text = text.strip()
    if not text:
        return []
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("chunk_overlap must be >= 0 and smaller than chunk_size")

    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    text_len = len(text)
    step = chunk_size - overlap

    while start < text_len:
        end = min(start + chunk_size, text_len)
        if end < text_len:
            next_space = text.find(" ", end)
            if 0 <= (next_space - end) < MAX_LOOKAHEAD_FOR_WORD_BOUNDARY:
                end = next_space
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= text_len:
            break
        start += step

    return chunks


def sanitize_id_component(value: str) -> str:
    """Make a string safe to use inside a Chroma document ID."""
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "section"


def build_chunk_records(file_path: Path, root: Path) -> list[ChunkRecord]:
    raw_text = file_path.read_text(encoding="utf-8", errors="replace")
    if not raw_text.strip():
        return []

    relative_path = str(file_path.relative_to(root)).replace("\\", "/")
    title = extract_title(raw_text, fallback=file_path.stem.replace("_", " ").replace("-", " "))
    sections = split_into_sections(raw_text)

    records: list[ChunkRecord] = []
    file_slug = sanitize_id_component(relative_path)

    for section_idx, (heading, body) in enumerate(sections):
        section_chunks = chunk_text(body, CHUNK_SIZE, CHUNK_OVERLAP)
        section_slug = sanitize_id_component(heading)

        for chunk_idx, chunk in enumerate(section_chunks):
            chunk_id = f"{file_slug}__{section_slug}__{section_idx}-{chunk_idx}"
            records.append(
                ChunkRecord(
                    id=chunk_id,
                    text=chunk,
                    metadata={
                        "filename": relative_path,
                        "title": title,
                        "section": heading,
                        "chunk_id": chunk_id,
                    },
                )
            )

    return records


# --------------------------------------------------------------------------
# Embedding model loading (with fallback)
# --------------------------------------------------------------------------
def load_embedding_model(primary: str, fallback: str, device: str) -> tuple[SentenceTransformer, str]:
    try:
        logger.info("Loading primary embedding model '%s' on device '%s'", primary, device)
        model = SentenceTransformer(primary, device=device)
        logger.info("Loaded primary embedding model '%s'", primary)
        return model, primary
    except Exception as exc:
        logger.warning(
            "Failed to load primary embedding model '%s' (%s). Falling back to '%s'.",
            primary, exc, fallback,
        )

    try:
        model = SentenceTransformer(fallback, device=device)
        logger.info("Loaded fallback embedding model '%s'", fallback)
        return model, fallback
    except Exception as exc:
        logger.critical("Failed to load fallback embedding model '%s': %s", fallback, exc)
        raise RuntimeError(
            f"Could not load either '{primary}' or fallback '{fallback}'. Aborting."
        ) from exc


# --------------------------------------------------------------------------
# ChromaDB
# --------------------------------------------------------------------------
def get_chroma_collection(persist_dir: Path, collection_name: str, reset: bool = False):
    persist_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=str(persist_dir),
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    if reset:
        try:
            client.delete_collection(name=collection_name)
            logger.info("Deleted existing collection '%s' (--reset)", collection_name)
        except Exception:
            logger.debug("No existing collection '%s' to delete", collection_name)

    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )
    return collection


def upsert_file_records(collection, records: list[ChunkRecord], relative_path: str) -> int:
    """Delete any prior chunks for this file, then add the current set (idempotent re-ingestion)."""
    try:
        collection.delete(where={"filename": relative_path})
    except Exception as exc:
        # Non-fatal: collection may not have entries for this file yet.
        logger.debug("No prior chunks to delete for '%s' (%s)", relative_path, exc)

    if not records:
        return 0

    ids = [r.id for r in records]
    documents = [r.text for r in records]
    metadatas = [r.metadata for r in records]

    embeddings = EMBEDDING_MODEL.encode(
        documents,
        batch_size=EMBEDDING_BATCH_SIZE,
        show_progress_bar=False,
        convert_to_numpy=True,
    ).tolist()

    collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    return len(records)


# --------------------------------------------------------------------------
# Main pipeline
# --------------------------------------------------------------------------
EMBEDDING_MODEL: SentenceTransformer  # set in main()


def run_ingestion(kb_dir: Path, reset: bool) -> IngestStats:
    global EMBEDDING_MODEL

    stats = IngestStats()
    start_time = time.monotonic()

    logger.info("Knowledge base directory: %s", kb_dir)
    logger.info("Chroma persist directory: %s", settings.chroma_persist_path)
    logger.info("Chroma collection: %s", settings.CHROMA_COLLECTION_NAME)
    logger.info("Chunk size / overlap: %d / %d", CHUNK_SIZE, CHUNK_OVERLAP)

    files = discover_markdown_files(kb_dir)
    stats.files_found = len(files)
    if not files:
        logger.warning("No markdown files found under %s. Nothing to ingest.", kb_dir)
        return stats

    logger.info("Discovered %d markdown file(s)", len(files))

    EMBEDDING_MODEL, model_used = load_embedding_model(
        PRIMARY_EMBEDDING_MODEL, FALLBACK_EMBEDDING_MODEL, settings.EMBEDDING_DEVICE
    )
    if model_used != PRIMARY_EMBEDDING_MODEL:
        logger.warning(
            "Embeddings generated with fallback model '%s' instead of requested '%s'",
            model_used, PRIMARY_EMBEDDING_MODEL,
        )

    collection = get_chroma_collection(
        settings.chroma_persist_path, settings.CHROMA_COLLECTION_NAME, reset=reset
    )

    for file_path in tqdm(files, desc="Ingesting knowledge base", unit="file"):
        relative_path = str(file_path.relative_to(kb_dir)).replace("\\", "/")
        try:
            records = build_chunk_records(file_path, kb_dir)
            if not records:
                logger.warning("Skipping empty or unparsable file: %s", relative_path)
                stats.files_skipped_empty += 1
                continue

            added = upsert_file_records(collection, records, relative_path)
            stats.chunks_added += added
            stats.files_ok += 1
            logger.info("Ingested '%s' -> %d chunk(s)", relative_path, added)

        except Exception as exc:
            logger.error("Failed to ingest '%s': %s", relative_path, exc, exc_info=True)
            stats.files_failed += 1
            stats.failed_files.append(relative_path)
            continue  # one bad file must not abort the whole run

    elapsed = time.monotonic() - start_time
    logger.info(
        "Ingestion finished in %.2fs | files_found=%d files_ok=%d files_failed=%d "
        "files_skipped_empty=%d chunks_added=%d",
        elapsed, stats.files_found, stats.files_ok, stats.files_failed,
        stats.files_skipped_empty, stats.chunks_added,
    )
    if stats.failed_files:
        logger.error("Files that failed ingestion: %s", stats.failed_files)

    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest TransitOps knowledge base into ChromaDB")
    parser.add_argument(
        "--kb-dir",
        type=str,
        default=None,
        help="Override knowledge base directory (defaults to settings.KNOWLEDGE_BASE_DIR)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete the existing Chroma collection before ingesting (full rebuild)",
    )
    return parser.parse_args()


def main() -> int:
    setup_logging()
    args = parse_args()
    kb_dir = Path(args.kb_dir).resolve() if args.kb_dir else settings.knowledge_base_path

    try:
        stats = run_ingestion(kb_dir, reset=args.reset)
    except Exception as exc:
        logger.critical("Ingestion aborted due to an unrecoverable error: %s", exc, exc_info=True)
        return 1

    if stats.files_found == 0:
        return 1
    if stats.files_failed > 0 and stats.files_ok == 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
