import shutil
import uuid
import zipfile
from pathlib import Path

import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.supabase import supabase

router = APIRouter()

UPLOAD_DIR = Path("data/uploads")
EXTRACT_DIR = Path("data/repos")
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200MB, matches MAX_UPLOAD_MB from AGENTS.md


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


@router.post("/ingest")
async def ingest_repo(file: UploadFile = File(...)):
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

    result = (
        supabase.table("repos")
        .insert({"id": repo_id, "name": repo_name, "status": "processing"})
        .execute()
    )

    extract_path = EXTRACT_DIR / repo_id
    try:
        safe_extract(zip_path, extract_path)
    except (zipfile.BadZipFile, HTTPException) as e:
        supabase.table("repos").update({"status": "failed"}).eq("id", repo_id).execute()
        shutil.rmtree(extract_path, ignore_errors=True)
        raise
    finally:
        zip_path.unlink(missing_ok=True)

    supabase.table("repos").update({"status": "extracted"}).eq("id", repo_id).execute()

    return {"repo_id": repo_id, "name": repo_name, "status": "extracted"}