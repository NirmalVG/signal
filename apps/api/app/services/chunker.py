# Place this file at: apps/api/app/services/chunker.py
#
# Depends on: app/services/parser.py (from Step 6)

from pathlib import Path

from app.services.parser import (
    REJECT_DIRS,
    EXTENSION_LANGUAGE_MAP,
    extract_definitions,
)

DOC_EXTENSIONS = {".md", ".mdx", ".txt"}
CODE_WINDOW_SIZE = 200
DOC_CHUNK_MIN_CHARS = 200
DOC_CHUNK_MAX_CHARS = 1500


def _is_rejected(path: Path) -> bool:
    return any(part in REJECT_DIRS for part in path.parts)


def _line_windows(lines: list[str], size: int = CODE_WINDOW_SIZE):
    """Yield non-overlapping (start_line, end_line, text) windows, 1-indexed."""
    for start in range(0, len(lines), size):
        window = lines[start:start + size]
        if not window:
            continue
        yield start + 1, start + len(window), "\n".join(window)


def chunk_code_file(path: Path, root: Path) -> list[dict]:
    """
    Two independent, deliberately overlapping chunk sets:
      - code_semantic: one chunk per function/class, via tree-sitter definitions
      - code_window: fixed 200-line slices across the whole file

    file_path is stored RELATIVE to the repo root (e.g. "app/layout.tsx"),
    not the absolute extraction path — citations shown to a user should
    never leak internal storage details like a repo_id folder.
    """
    source_bytes = path.read_bytes()
    lines = source_bytes.decode(errors="ignore").splitlines()
    # .as_posix() forces forward slashes regardless of OS, so citations look
    # identical whether this runs on your Windows dev machine or a Linux host.
    rel_path = path.relative_to(root).as_posix()
    chunks: list[dict] = []

    for d in extract_definitions(path):
        start, end = d["start_line"], d["end_line"]
        text = "\n".join(lines[start - 1:end])
        chunks.append({
            "file_path": rel_path,
            "start_line": start,
            "end_line": end,
            "text": text,
            "kind": "code_semantic",
        })

    for start, end, text in _line_windows(lines):
        chunks.append({
            "file_path": rel_path,
            "start_line": start,
            "end_line": end,
            "text": text,
            "kind": "code_window",
        })

    return chunks


def chunk_doc_file(path: Path, root: Path) -> list[dict]:
    """
    Paragraph-based chunking for .md/.mdx/.txt files. Paragraphs (split on
    blank lines) are merged together until they approach DOC_CHUNK_MAX_CHARS.

    Note: line numbers here are approximate — collapsing on "\n\n" loses
    exact blank-line counts when a file has multiple consecutive blank
    lines. Good enough for citing "roughly where this came from."
    """
    text = path.read_text(encoding="utf-8", errors="ignore")
    rel_path = path.relative_to(root).as_posix()
    raw_paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks: list[dict] = []
    buffer = ""
    buffer_start_line = 1
    current_line = 1

    for para in raw_paragraphs:
        para_line_count = para.count("\n") + 1
        candidate = f"{buffer}\n\n{para}".strip() if buffer else para

        if len(candidate) > DOC_CHUNK_MAX_CHARS and buffer:
            chunks.append({
                "file_path": rel_path,
                "start_line": buffer_start_line,
                "end_line": current_line - 1,
                "text": buffer,
                "kind": "doc_paragraph",
            })
            buffer = para
            buffer_start_line = current_line
        else:
            buffer = candidate

        current_line += para_line_count + 1  # +1 for the blank-line separator

    if buffer:
        chunks.append({
            "file_path": rel_path,
            "start_line": buffer_start_line,
            "end_line": current_line - 1,
            "text": buffer,
            "kind": "doc_paragraph",
        })

    return chunks


def chunk_repo(root: Path) -> list[dict]:
    """Walk an extracted repo and return every chunk (code + docs) found in it."""
    chunks: list[dict] = []

    for path in root.rglob("*"):
        if path.is_dir() or _is_rejected(path):
            continue
        if path.suffix in EXTENSION_LANGUAGE_MAP:
            chunks.extend(chunk_code_file(path, root))
        elif path.suffix in DOC_EXTENSIONS:
            chunks.extend(chunk_doc_file(path, root))

    return chunks


if __name__ == "__main__":
    # Quick manual test — update repo_path to point at your extracted test repo.
    repo_path = Path("data/repos/107482ca-a425-4527-a883-43f90c92a2c8/test-repo")

    results = chunk_repo(repo_path)
    print(f"Total chunks: {len(results)}")
    for c in results:
        preview = c["text"][:60].replace("\n", " ")
        print(f"[{c['kind']}] {c['file_path']}:{c['start_line']}-{c['end_line']}  {preview!r}")