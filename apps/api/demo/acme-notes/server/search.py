"""Search over one user's notes.

Notes are scored in Python rather than in SQL so the ranking rules are easy to
read and test. A word in the title counts three times as much as the same word
in the body, pinned notes get a small boost, and ties fall back to recency.
"""
import re

from .notes import list_notes

TITLE_WEIGHT = 3
BODY_WEIGHT = 1
PINNED_BONUS = 2


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def score_note(note: dict, terms: list[str]) -> int:
    title_words = tokenize(note["title"])
    body_words = tokenize(note["body"])
    score = 0
    for term in terms:
        score += TITLE_WEIGHT * title_words.count(term)
        score += BODY_WEIGHT * body_words.count(term)
    if score and note["pinned"]:
        score += PINNED_BONUS
    return score


def search_notes(owner_id: int, query: str, limit: int = 10) -> list[dict]:
    terms = tokenize(query)
    if not terms:
        return []
    scored = [(score_note(note, terms), note) for note in list_notes(owner_id, limit=500)]
    ranked = [pair for pair in scored if pair[0] > 0]
    # list_notes already returns newest first and sorted() is stable, so equal
    # scores keep that recency order.
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return [note for _, note in ranked[:limit]]
