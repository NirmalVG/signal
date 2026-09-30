import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 1024
BATCH_SIZE = 128

# ---------------------------------------------------------------------------
# Jina AI (primary) — https://jina.ai/embeddings/
# ---------------------------------------------------------------------------
_JINA_URL = "https://api.jina.ai/v1/embeddings"
_JINA_MODEL = "jina-embeddings-v3"

# Jina v3 task types for asymmetric retrieval:
#   - "retrieval.passage" → for chunks being stored
#   - "retrieval.query"   → for user questions at search time
_JINA_TASK_MAP = {
    "document": "retrieval.passage",
    "query": "retrieval.query",
}


def _embed_jina(texts: list[str], input_type: str) -> Optional[list[list[float]]]:
    """Call Jina AI embeddings API.  Returns None on any failure."""
    api_key = settings.jina_api_key
    if not api_key:
        return None

    try:
        resp = httpx.post(
            _JINA_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": _JINA_MODEL,
                "input": texts,
                "task": _JINA_TASK_MAP.get(input_type, "retrieval.passage"),
                "dimensions": EMBEDDING_DIM,
            },
            timeout=60.0,
        )
        if resp.status_code == 429 or resp.status_code >= 500:
            logger.warning("Jina API returned %s — falling back to local model", resp.status_code)
            return None
        resp.raise_for_status()

        data = resp.json()["data"]
        # Jina returns embeddings sorted by index, but let's be safe.
        data.sort(key=lambda d: d["index"])
        return [d["embedding"] for d in data]

    except (httpx.HTTPError, KeyError, Exception) as exc:
        logger.warning("Jina API error (%s) — falling back to local model", exc)
        return None


# ---------------------------------------------------------------------------
# Local fallback — BAAI/bge-large-en-v1.5 (1024 dims, matches Jina)
# Lazy-loaded: only downloads the ~1.3 GB model when Jina is unavailable.
# ---------------------------------------------------------------------------
_local_model = None
_LOCAL_MODEL_NAME = "BAAI/bge-large-en-v1.5"
_LOCAL_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


def _get_local_model():
    global _local_model
    if _local_model is None:
        logger.info("Loading local fallback model %s (first time may download ~1.3 GB)…", _LOCAL_MODEL_NAME)
        from sentence_transformers import SentenceTransformer
        _local_model = SentenceTransformer(_LOCAL_MODEL_NAME)
    return _local_model


def _embed_local(texts: list[str], input_type: str) -> list[list[float]]:
    """Embed using the local sentence-transformers model."""
    model = _get_local_model()

    if input_type == "query":
        texts = [_LOCAL_QUERY_PREFIX + t for t in texts]

    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return embeddings.tolist()


# ---------------------------------------------------------------------------
# Public API — same signature as before, fully backward-compatible.
# ---------------------------------------------------------------------------
def embed_texts(texts: list[str], input_type: str = "document") -> list[list[float]]:
    """
    Embed texts using Jina AI (primary) with local fallback.

    input_type controls asymmetric search behavior:
      - "document": embed as stored passages
      - "query":    embed as search queries
    """
    # Try Jina first (fast, high quality, 1024 dims).
    result = _embed_jina(texts, input_type)
    if result is not None:
        return result

    # Fallback to local model (same 1024 dims, no API needed).
    return _embed_local(texts, input_type)


if __name__ == "__main__":
    vectors = embed_texts(["def add(a, b):\n    return a + b"], input_type="document")
    print(f"Got {len(vectors)} embeddings, each with {len(vectors[0])} dimensions")