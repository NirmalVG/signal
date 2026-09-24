from fastapi import FastAPI
from app.routes import health, ingest

app = FastAPI(title="Signal API")
app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")