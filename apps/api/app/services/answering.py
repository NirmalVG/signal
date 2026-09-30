# Place this file at: apps/api/app/services/answering.py

import hashlib
import re
import time

from groq import Groq

from app.core.config import settings
from app.core.supabase import supabase
from app.services.indexer import search_chunks

_groq_client = Groq(api_key=settings.groq_api_key)

GENERATION_MODEL = "openai/gpt-oss-120b"
SIMILARITY_FLOOR = 0.2   # reject chunks below this before offering them as context
MAX_CONTEXT_CHUNKS = 8

SYSTEM_PROMPT = """You are Signal, an AI assistant that answers questions about a \
codebase using ONLY the provided context chunks. Rules:
- Only use information present in the context below. Never invent file paths, \
line numbers, or function names.
- Every claim must cite its source using EXACTLY this format, with plain ASCII \
square brackets — no other bracket style: [file_path:line_number]
  Example: [app/layout.tsx:20]
- Do NOT use full-width, Chinese-style, or any bracket characters other than \
the plain ASCII "[" and "]".
- If the context doesn't contain enough information to answer, say so plainly \
instead of guessing.
- Be concise and technical."""

# Matches EITHER plain ASCII brackets [path:line] OR full-width brackets
# 【path:line】 — some models (this one included, observed in testing) default
# to full-width citation brackets regardless of instructions. We instruct
# firmly for ASCII above, but validate against both as defense in depth:
# what actually matters is that any citation, in whatever bracket style,
# points at a chunk we really retrieved.
CITATION_PATTERN = re.compile(r"[\[\u3010]([^\]\u3011:]+):\d+[\]\u3011]")


def _build_context(chunks: list[dict]) -> str:
    blocks = []
    for c in chunks:
        blocks.append(
            f"[{c['file_path']}:{c['line_number']}] "
            f"({c['kind']}, similarity {c['similarity']:.2f})\n{c['text']}"
        )
    return "\n\n---\n\n".join(blocks)


def _generate(question: str, context_text: str) -> str:
    completion = _groq_client.chat.completions.create(
        model=GENERATION_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {question}"},
        ],
        temperature=0.2,
    )
    return completion.choices[0].message.content


def _citations_valid(answer_text: str, valid_paths: set[str]) -> bool:
    cited_paths = set(CITATION_PATTERN.findall(answer_text))
    # No citations at all is allowed (e.g. the model correctly says "not enough
    # context") — what's NOT allowed is citing a path we never actually retrieved.
    return cited_paths.issubset(valid_paths)


def answer_question(repo_id: str, question: str) -> dict:
    start = time.monotonic()

    candidates = search_chunks(repo_id, question, match_count=MAX_CONTEXT_CHUNKS)
    relevant = [c for c in candidates if c["similarity"] >= SIMILARITY_FLOOR]

    if not relevant:
        return {
            "answer": "I couldn't find anything in this repo relevant to that question.",
            "context": [],
            "confidence": 0.0,
            "latency_ms": int((time.monotonic() - start) * 1000),
        }

    context_text = _build_context(relevant)
    valid_paths = {c["file_path"] for c in relevant}

    answer_text = _generate(question, context_text)

    if not _citations_valid(answer_text, valid_paths):
        # One retry, per AGENTS.md section 13 — a firmer nudge the second time.
        answer_text = _generate(
            question + "\n\n(Reminder: use plain ASCII [file_path:line_number] "
            "citations only, exactly as shown in the context above — do not "
            "cite any other path.)",
            context_text,
        )
        if not _citations_valid(answer_text, valid_paths):
            answer_text = (
                "I found relevant context, but couldn't produce a reliably-cited "
                "answer. Try rephrasing the question."
            )

    # The model reliably ignores our ASCII-bracket instruction and uses
    # full-width brackets anyway (observed consistently in testing) — rather
    # than keep fighting a prompt-level instruction that doesn't stick,
    # normalize the output so whatever ships to a frontend is always
    # plain ASCII, regardless of what the model actually emitted.
    answer_text = answer_text.replace("\u3010", "[").replace("\u3011", "]")

    confidence = relevant[0]["similarity"]
    latency_ms = int((time.monotonic() - start) * 1000)

    answer_hash = hashlib.sha256(answer_text.encode()).hexdigest()[:16]
    supabase.table("queries").insert({
        "repo_id": repo_id,
        "question": question,
        "answer_hash": answer_hash,
        "latency_ms": latency_ms,
    }).execute()

    return {
        "answer": answer_text,
        "context": relevant,
        "confidence": confidence,
        "latency_ms": latency_ms,
    }