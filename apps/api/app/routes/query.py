# Place this file at: apps/api/app/routes/query.py

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.access import get_repo_for
from app.core.auth import OptionalUser
from app.services.answering import answer_question


router = APIRouter()


class QueryRequest(BaseModel):
    repo_id: str
    # Bounded input: every character costs embedding and LLM tokens.
    question: str = Field(min_length=1, max_length=2000)


@router.post("/query")
def query_repo(payload: QueryRequest, user: OptionalUser):
    # 404 unless this repo is yours (signed in) or the demo (guest). Without
    # this, anyone could ask questions about, and read chunks of, any repo id.
    get_repo_for(payload.repo_id, user)
    return answer_question(payload.repo_id, payload.question)