# Place this file at: apps/api/app/routes/ingest.py

import shutil
import uuid
import zipfile
from pathlib import Path

import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks

from app.core.supabase import supabase
from app.services.indexer import run_indexing

router = APIRouter()

UPLOAD_DIR = Path("data/uploads")
EXTRACT_DIR = Path("data/repos")
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200MB


def safe_extract(zip_path: Path, dest: Path) -> None:
    dest = dest.resolve()
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.infolist():
            member_path = (dest / member.filename).resolve()
            if not str(member_path).startswith(str(dest)):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsafe path in archive: {member.filename}",
                )
        zf.extractall(dest)


def find_repo_root(extract_path: Path) -> Path:
    """
    Most zip tools wrap contents in a folder matching the archive name
    (e.g. test-repo.zip -> test-repo/), but not all do. If extraction
    produced exactly one top-level directory, treat that as the real
    repo root; otherwise assume source files sit directly at extract_path.
    """
    entries = list(extract_path.iterdir())
    if len(entries) == 1 and entries[0].is_dir():
        return entries[0]
    return extract_path


@router.post("/ingest")
async def ingest_repo(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    repo_name = file.filename.removesuffix(".zip")
    repo_id = str(uuid.uuid4())

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = UPLOAD_DIR / f"{repo_id}.zip"

    size = 0
    async with aiofiles.open(zip_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                zip_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Archive too large")
            await out_file.write(chunk)

    supabase.table("repos").insert(
        {"id": repo_id, "name": repo_name, "status": "processing"}
    ).execute()

    extract_path = EXTRACT_DIR / repo_id
    try:
        safe_extract(zip_path, extract_path)
    except (zipfile.BadZipFile, HTTPException):
        supabase.table("repos").update({"status": "failed"}).eq("id", repo_id).execute()
        shutil.rmtree(extract_path, ignore_errors=True)
        raise
    finally:
        zip_path.unlink(missing_ok=True)

    supabase.table("repos").update({"status": "extracted"}).eq("id", repo_id).execute()

    repo_root = find_repo_root(extract_path)
    background_tasks.add_task(run_indexing, repo_id, repo_root)

    return {"repo_id": repo_id, "name": repo_name, "status": "extracted"}