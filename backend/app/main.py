"""
FastAPI Application
===================
Application instance with CORS, lifespan, and router mounting.

Run locally:
    cd backend
    python -m uvicorn app.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api_routes import router
from app.config import settings
from app.database import Base, engine

# ── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-20s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup."""
    logger.info("Creating database tables …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database ready ✓")
    yield
    logger.info("Shutting down …")


# ── Application ───────────────────────────────────────────────────────────
app = FastAPI(
    title="Algorithmic Market Analyzer",
    description=(
        "A quantitative analysis API that fetches OHLCV data, engineers "
        "statistical features, trains a Random Forest classifier, and "
        "backtests trading strategies."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ───────────────────────────────────────────────────────
# Allow the Next.js frontend to communicate with this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routes ──────────────────────────────────────────────────────────
app.include_router(router)
