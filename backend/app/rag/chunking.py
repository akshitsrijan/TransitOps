import re
from dataclasses import dataclass

CHUNK_CHARS = 900
CHUNK_OVERLAP = 150


@dataclass
class Chunk:
    id: str
    text: str
    source: str
    heading: str


def _current_heading(line: str, fallback: str) -> str:
    match = re.match(r"^#{1,6}\s+(.*)", line)
    return match.group(1).strip() if match else fallback


def chunk_markdown(source: str, text: str) -> list[Chunk]:
    """Split a markdown doc into overlapping chunks, tracking the nearest heading
    for each so retrieval results carry useful section context."""
    paragraphs: list[tuple[str, str]] = []  # (heading, paragraph_text)
    heading = source
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        first_line = para.splitlines()[0]
        heading = _current_heading(first_line, heading)
        if re.match(r"^#{1,6}\s+", first_line):
            continue  # heading-only paragraph, skip as its own chunk
        paragraphs.append((heading, para))

    chunks: list[Chunk] = []
    buffer = ""
    buffer_heading = heading
    idx = 0

    def flush():
        nonlocal buffer, idx
        if buffer.strip():
            chunks.append(Chunk(id=f"{source}::{idx}", text=buffer.strip(), source=source, heading=buffer_heading))
            idx += 1

    for h, para in paragraphs:
        if not buffer:
            buffer_heading = h
        candidate = f"{buffer}\n\n{para}" if buffer else para
        if len(candidate) > CHUNK_CHARS and buffer:
            flush()
            overlap_tail = buffer[-CHUNK_OVERLAP:] if len(buffer) > CHUNK_OVERLAP else buffer
            buffer = f"{overlap_tail}\n\n{para}"
            buffer_heading = h
        else:
            buffer = candidate
    flush()
    return chunks
