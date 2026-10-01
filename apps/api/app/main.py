from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.protection import install_protection
from app.routes import health, ingest, meta, repos, query

app = FastAPI(title="Signal API")

# ORDER MATTERS. The last middleware added is the OUTERMOST one. CORS must wrap
# protection so that even our early 403/429 responses carry CORS headers;
# otherwise the browser hides them behind a generic network error.
install_protection(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(meta.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(repos.router, prefix="/api")
app.include_router(query.router, prefix="/api")