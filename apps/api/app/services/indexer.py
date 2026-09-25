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


if __name__ == "__main__":
    # Update these two values to match your test repo before running.
    repo_id = "c56cf2e2-1608-4ef2-b60f-1317e5e9b40e"
    repo_path = Path(f"data/repos/{repo_id}/test-repo")

    print("Indexing...")
    result = index_repo(repo_id, repo_path)
    print(result)

    print("\nSearching for: 'root layout component'")
    for r in search_chunks(repo_id, "root layout component"):
        preview = r["text"][:60].replace("\n", " ")
        print(f"  [{r['similarity']:.3f}] [{r['kind']}] {r['file_path']}:{r['line_number']}  {preview!r}")