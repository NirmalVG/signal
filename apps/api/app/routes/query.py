# Place this file at: apps/api/app/routes/query.py

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.answering import answer_question


router = APIRouter()


class QueryRequest(BaseModel):
    repo_id: str
    # Bounded input: every character costs embedding and LLM tokens.
    question: str = Field(min_length=1, max_length=2000)


@router.post("/query")
def query_repo(payload: QueryRequest):
    return answer_question(payload.repo_id, payload.question)