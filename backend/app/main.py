import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import uvicorn

from app.database import schema, connection
from app.api import upload, dashboard, ml_routes

# Resolve frontend/dist relative to this file: backend/app/main.py -> ../../frontend/dist
_HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.normpath(os.path.join(_HERE, "..", "..", "frontend", "dist"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm the cache on startup so the first request is instant."""
    schema.Base.metadata.create_all(bind=connection.engine)
    try:
        from app.services.cache_builder import build_cache
        db = connection.SessionLocal()
        build_cache(db)
        db.close()
        print("[startup] Cache warmed successfully.")
    except Exception as e:
        print(f"[startup] Cache warm failed (non-fatal): {e}")
    yield
    # shutdown — nothing to clean up


app = FastAPI(
    title="Foresight API",
    description="Infrastructure Project Risk Monitoring — PAIMANA Compliant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(dashboard.router)
app.include_router(ml_routes.router)


# ── Serve React SPA (only when dist/ exists — dev mode falls back to vite dev server) ──
if os.path.isdir(FRONTEND_DIST):
    # Static asset folders (hashed filenames from Vite build)
    _assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve individual static files that exist; fall back to index.html for SPA routing."""
        if full_path:
            candidate = os.path.join(FRONTEND_DIST, full_path)
            if os.path.isfile(candidate):
                return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Welcome to Foresight API", "version": "1.0.0", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
