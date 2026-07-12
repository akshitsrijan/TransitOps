import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.config import settings
from app.database import engine, init_db
from app.rag.ingest import ensure_ingested
from app.routers import auth, drivers, expenses, maintenance, rag, reports, trips, vehicles
from app.seed import seed_if_empty

logger = logging.getLogger("transitops")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with Session(engine) as session:
        seed_if_empty(session)
    logger.info("Ingesting RAG policy corpus (skipped if already persisted)...")
    ensure_ingested()
    logger.info("Startup complete.")
    yield


app = FastAPI(title="TransitOps API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(drivers.router)
app.include_router(trips.router)
app.include_router(maintenance.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(rag.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
