from fastapi import FastAPI
from app.routes import health

app = FastAPI(title="Signal API")
app.include_router(health.router, prefix="/api")