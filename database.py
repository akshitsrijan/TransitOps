"""
Database engine, session factory, and declarative base.

This is the single source of truth for how the app talks to MySQL.
- `engine`      : manages the actual connection pool to MySQL.
- `SessionLocal`: factory that creates new SQLAlchemy sessions per request.
- `Base`        : declarative base that all ORM models (app/models/*) inherit from.
- `get_db`      : FastAPI dependency that yields a session and guarantees
                   it's closed after the request, even on error.
"""

import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config.config import settings

logger = logging.getLogger(__name__)

# --- Engine ---
# pool_pre_ping avoids "MySQL server has gone away" errors from stale
# connections (MySQL closes idle connections after wait_timeout).
engine = create_engine(
    settings.sqlalchemy_database_uri,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    echo=settings.DB_ECHO,
    future=True,
)

# --- Session factory ---
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # avoids re-querying after commit for response serialization
)


class Base(DeclarativeBase):
    """Declarative base class. All ORM models in app/models must inherit from this."""
    pass


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency. Yields a SQLAlchemy session scoped to a single
    request and ensures it is always closed, and rolled back on error.

    Usage in a router:
        @router.get("/shipments")
        def list_shipments(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Non-FastAPI context-manager version of get_db, for use in scripts,
    background jobs, or services that run outside the request lifecycle.

    Usage:
        with get_db_context() as db:
            db.query(...)
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> bool:
    """
    Simple health-check helper (used by a /health endpoint or startup event)
    to verify the database is reachable.
    """
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return True
    except Exception as e:
        logger.error("Database connection check failed: %s", e)
        return False
