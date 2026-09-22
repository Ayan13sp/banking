"""
Database Connection
===================
SQLAlchemy engine, session factory, and declarative Base.

Usage in FastAPI routes:
    from app.database import get_db
    def my_route(db: Session = Depends(get_db)):
        ...
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

# ── Engine ────────────────────────────────────────────────────────────────
# SQLite requires `check_same_thread=False` for FastAPI's async workers.
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Set True for SQL debug logging
)

# ── Session Factory ───────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Declarative Base ──────────────────────────────────────────────────────
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a database session and ensures
    it is closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
