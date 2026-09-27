# Place this file at: apps/api/app/services/indexer.py

from datetime import datetime, timezone
from pathlib import Path

from app.core.supabase import supabase
from app.services.chunker import chunk_repo
from app.services.embedder import embed_texts

INSERT_BATCH_SIZE = 100


def index_repo(repo_id: str, repo_path: Path) -> dict:
    """Chunk a repo, embed every chunk as 'document', and insert into `chunks`."""
    chunks = chunk_repo(repo_path)
    if not chunks:
        return {"chunks_indexed": 0}

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts, input_type="document")

    rows = [
        {
            "repo_id": repo_id,
            "file_path": c["file_path"],
            "line_number": c["start_line"],
            "end_line": c["end_line"],
            "text": c["text"],
            "kind": c["kind"],
            "embedding": embedding,
        }
        for c, embedding in zip(chunks, embeddings)
    ]

    for i in range(0, len(rows), INSERT_BATCH_SIZE):
        batch = rows[i:i + INSERT_BATCH_SIZE]
        supabase.table("chunks").insert(batch).execute()

    return {"chunks_indexed": len(rows)}


def run_indexing(repo_id: str, repo_path: Path) -> None:
    """
    Background-task entrypoint called by /api/ingest after extraction.
    Drives repos.status through: indexing -> indexed (or -> failed).

    This runs in a thread pool (FastAPI/Starlette does this automatically
    for non-async background tasks), so a slow embedding run never blocks
    the event loop from serving other requests in the meantime.
    """
    try:
        supabase.table("repos").update({"status": "indexing"}).eq("id", repo_id).execute()

        result = index_repo(repo_id, repo_path)

        supabase.table("repos").update({
            "status": "indexed",
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", repo_id).execute()

        print(f"[ingest] repo {repo_id} indexed: {result}")

    except Exception as e:
        supabase.table("repos").update({"status": "failed"}).eq("id", repo_id).execute()
        print(f"[ingest] repo {repo_id} failed: {e}")


def search_chunks(repo_id: str, question: str, match_count: int = 5) -> list[dict]:
    """Embed a question as 'query' and return the most similar stored chunks."""
    query_embedding = embed_texts([question], input_type="query")[0]

    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_repo_id": repo_id,
            "match_count": match_count,
        },
    ).execute()

    return result.data