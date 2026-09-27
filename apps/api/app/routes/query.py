# Place this file at: apps/api/app/routes/query.py

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.answering import answer_question

router = APIRouter()


class QueryRequest(BaseModel):
    repo_id: str
    question: str


@router.post("/query")
def query_repo(payload: QueryRequest):
    return answer_question(payload.repo_id, payload.question)