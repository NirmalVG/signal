import voyageai

from app.core.config import settings

EMBEDDING_MODEL = "voyage-code-3"
EMBEDDING_DIM = 1024
BATCH_SIZE = 128

_client = voyageai.Client(api_key=settings.voyage_api_key)


def embed_texts(texts: list[str], input_type: str = "document") -> list[list[float]]:
    """
    Embed a list of texts via Voyage AI's voyage-code-3 model.

    input_type matters: Voyage's models are trained asymmetrically — a chunk
    being STORED for later retrieval should be embedded as "document", while
    a user's QUESTION at search time should be embedded as "query". Using
    the same encoding for both doesn't error, it just quietly hurts
    retrieval quality, since the model expects that distinction.
    """
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        result = _client.embed(batch, model=EMBEDDING_MODEL, input_type=input_type)
        all_embeddings.extend(result.embeddings)

    return all_embeddings


if __name__ == "__main__":
    # Quick manual test — confirms the API key + model work.
    vectors = embed_texts(["def add(a, b):\n    return a + b"], input_type="document")
    print(f"Got {len(vectors)} embeddings, each with {len(vectors[0])} dimensions")