from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.database import schema, connection
from app.api import upload, dashboard, ml_routes


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


@app.get("/")
def read_root():
    return {"message": "Welcome to Foresight API", "version": "1.0.0", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
