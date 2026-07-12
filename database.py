"""
TransitOps RAG — MySQL access layer (read-only operational-data helpers).

This module does NOT own the database schema and does NOT create tables —
that responsibility belongs to the CRUD backend team. It connects to their
existing MySQL database via SQLAlchemy Core and exposes read-only helper
functions the RAG layer can use to enrich retrieval/summarization with
operational context (e.g. "is this driver's license expired").

SCHEMA CONFIGURATION — READ THIS FIRST
----------------------------------------------------------------------------
Every table and column name this module touches is centralized in the
SCHEMA dict below. None of it has been validated against a real database —
it is a best-guess placeholder based on the function names requested
(get_driver, get_vehicle, get_trip, get_expired_licenses, etc.). Update
SCHEMA to match the CRUD team's actual table/column names before use.
Table and column names from SCHEMA are interpolated directly into SQL
strings (they are NOT user input, so this is not an injection risk), while
all runtime VALUES (ids, search terms, dates) are passed as bound
parameters — never string-interpolated.
----------------------------------------------------------------------------
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import bindparam, create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError

from app.config import settings

logger = logging.getLogger("transitops.database")


# ============================================================================
# CONFIGURABLE SCHEMA MAP — edit this block to match the real MySQL schema.
# ============================================================================
SCHEMA: dict[str, dict[str, Any]] = {
    "drivers": {
        "table": "drivers",
        "columns": {
            "id": "driver_id",
            "name": "name",
            "phone": "phone_number",
            "license_number": "license_number",
            "license_expiry": "license_expiry_date",
            "status": "status",
        },
    },
    "vehicles": {
        "table": "vehicles",
        "columns": {
            "id": "vehicle_id",
            "registration_number": "registration_number",
            "vehicle_type": "vehicle_type",
            "status": "status",
        },
    },
    "trips": {
        "table": "trips",
        "columns": {
            "id": "trip_id",
            "driver_id": "driver_id",
            "vehicle_id": "vehicle_id",
            "status": "status",
            "origin": "origin",
            "destination": "destination",
            "start_time": "start_time",
            "end_time": "end_time",
        },
    },
}

# Trip status values considered "active". Adjust to match real status enum/strings.
ACTIVE_TRIP_STATUSES: tuple[str, ...] = ("in_progress", "ongoing", "active")

# Default row cap for search functions, to avoid unbounded result sets.
DEFAULT_SEARCH_LIMIT = 20


class DatabaseConnectionError(RuntimeError):
    """Raised when the MySQL engine cannot be created or a connection cannot be established."""


class SchemaConfigurationError(RuntimeError):
    """Raised when a query fails in a way that suggests SCHEMA does not match the real database
    (e.g. unknown table/column) — distinct from 'no matching row found'."""


# ============================================================================
# Engine management
# ============================================================================
_engine: Optional[Engine] = None


def get_engine() -> Engine:
    """Lazily create and cache a single SQLAlchemy engine for the process."""
    global _engine
    if _engine is not None:
        return _engine

    try:
        _engine = create_engine(
            settings.mysql_url,
            pool_pre_ping=True,   # detect stale connections before use
            pool_recycle=1800,    # recycle connections every 30 min (MySQL default wait_timeout safety)
            pool_size=5,
            max_overflow=10,
            future=True,
        )
        logger.info("SQLAlchemy engine created for MySQL host '%s'", settings.MYSQL_HOST)
        return _engine
    except Exception as exc:
        logger.critical("Failed to create SQLAlchemy engine: %s", exc, exc_info=True)
        raise DatabaseConnectionError("Could not create SQLAlchemy engine for MySQL.") from exc


def check_connection() -> bool:
    """Lightweight healthcheck — returns True if a trivial query succeeds."""
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError as exc:
        logger.error("Database connection healthcheck failed: %s", exc)
        return False


# ============================================================================
# Internal helpers
# ============================================================================
def _row_to_dict(row) -> Optional[dict]:
    return dict(row._mapping) if row is not None else None


def _execute_one(query, params: dict) -> Optional[dict]:
    """Execute a query expected to return 0 or 1 row."""
    try:
        with get_engine().connect() as conn:
            result = conn.execute(query, params)
            row = result.first()
            return _row_to_dict(row)
    except (OperationalError,) as exc:
        logger.error("Database connection error during query: %s", exc, exc_info=True)
        raise DatabaseConnectionError("Lost connection to MySQL during query execution.") from exc
    except ProgrammingError as exc:
        logger.error(
            "SQL error — this usually means SCHEMA does not match the real database "
            "(unknown table/column): %s", exc, exc_info=True,
        )
        raise SchemaConfigurationError(
            "Query failed due to a likely mismatch between SCHEMA and the actual "
            "MySQL schema. Check table/column names in database.py."
        ) from exc
    except SQLAlchemyError as exc:
        logger.error("Unexpected database error: %s", exc, exc_info=True)
        return None


def _execute_many(query, params: dict) -> list[dict]:
    """Execute a query expected to return 0+ rows."""
    try:
        with get_engine().connect() as conn:
            result = conn.execute(query, params)
            rows = result.fetchall()
            return [_row_to_dict(r) for r in rows]
    except (OperationalError,) as exc:
        logger.error("Database connection error during query: %s", exc, exc_info=True)
        raise DatabaseConnectionError("Lost connection to MySQL during query execution.") from exc
    except ProgrammingError as exc:
        logger.error(
            "SQL error — this usually means SCHEMA does not match the real database "
            "(unknown table/column): %s", exc, exc_info=True,
        )
        raise SchemaConfigurationError(
            "Query failed due to a likely mismatch between SCHEMA and the actual "
            "MySQL schema. Check table/column names in database.py."
        ) from exc
    except SQLAlchemyError as exc:
        logger.error("Unexpected database error: %s", exc, exc_info=True)
        return []


# ============================================================================
# Driver helpers
# ============================================================================
def get_driver(driver_id: Any) -> Optional[dict]:
    """Fetch a single driver by primary key. Returns None if not found."""
    cfg = SCHEMA["drivers"]
    cols = cfg["columns"]
    query = text(f"SELECT * FROM {cfg['table']} WHERE {cols['id']} = :driver_id LIMIT 1")
    result = _execute_one(query, {"driver_id": driver_id})
    if result is None:
        logger.info("No driver found for driver_id=%r", driver_id)
    return result


def get_driver_status(driver_id: Any) -> Optional[str]:
    """Fetch just the status field for a driver. Returns None if driver not found."""
    cfg = SCHEMA["drivers"]
    cols = cfg["columns"]
    query = text(f"SELECT {cols['status']} AS status FROM {cfg['table']} WHERE {cols['id']} = :driver_id LIMIT 1")
    result = _execute_one(query, {"driver_id": driver_id})
    if result is None:
        logger.info("No driver found for driver_id=%r when fetching status", driver_id)
        return None
    return result.get("status")


def search_driver(query_str: str, limit: int = DEFAULT_SEARCH_LIMIT) -> list[dict]:
    """Search drivers by partial match on name, phone, or license number."""
    if not query_str or not query_str.strip():
        logger.warning("Empty search query passed to search_driver; returning no results.")
        return []

    cfg = SCHEMA["drivers"]
    cols = cfg["columns"]
    like_pattern = f"%{query_str.strip()}%"
    sql = text(
        f"SELECT * FROM {cfg['table']} "
        f"WHERE {cols['name']} LIKE :pattern "
        f"OR {cols['phone']} LIKE :pattern "
        f"OR {cols['license_number']} LIKE :pattern "
        f"LIMIT :limit"
    )
    return _execute_many(sql, {"pattern": like_pattern, "limit": limit})


def get_expired_licenses(as_of_date: Optional[str] = None, limit: int = DEFAULT_SEARCH_LIMIT) -> list[dict]:
    """
    Return drivers whose license_expiry date is before as_of_date (defaults to
    today, evaluated in MySQL via CURDATE()).
    """
    cfg = SCHEMA["drivers"]
    cols = cfg["columns"]

    if as_of_date:
        sql = text(
            f"SELECT * FROM {cfg['table']} "
            f"WHERE {cols['license_expiry']} < :as_of_date "
            f"ORDER BY {cols['license_expiry']} ASC LIMIT :limit"
        )
        params = {"as_of_date": as_of_date, "limit": limit}
    else:
        sql = text(
            f"SELECT * FROM {cfg['table']} "
            f"WHERE {cols['license_expiry']} < CURDATE() "
            f"ORDER BY {cols['license_expiry']} ASC LIMIT :limit"
        )
        params = {"limit": limit}

    return _execute_many(sql, params)


# ============================================================================
# Vehicle helpers
# ============================================================================
def get_vehicle(vehicle_id: Any) -> Optional[dict]:
    """Fetch a single vehicle by primary key. Returns None if not found."""
    cfg = SCHEMA["vehicles"]
    cols = cfg["columns"]
    query = text(f"SELECT * FROM {cfg['table']} WHERE {cols['id']} = :vehicle_id LIMIT 1")
    result = _execute_one(query, {"vehicle_id": vehicle_id})
    if result is None:
        logger.info("No vehicle found for vehicle_id=%r", vehicle_id)
    return result


def get_vehicle_status(vehicle_id: Any) -> Optional[str]:
    """Fetch just the status field for a vehicle. Returns None if vehicle not found."""
    cfg = SCHEMA["vehicles"]
    cols = cfg["columns"]
    query = text(f"SELECT {cols['status']} AS status FROM {cfg['table']} WHERE {cols['id']} = :vehicle_id LIMIT 1")
    result = _execute_one(query, {"vehicle_id": vehicle_id})
    if result is None:
        logger.info("No vehicle found for vehicle_id=%r when fetching status", vehicle_id)
        return None
    return result.get("status")


def search_vehicle(query_str: str, limit: int = DEFAULT_SEARCH_LIMIT) -> list[dict]:
    """Search vehicles by partial match on registration number or vehicle type."""
    if not query_str or not query_str.strip():
        logger.warning("Empty search query passed to search_vehicle; returning no results.")
        return []

    cfg = SCHEMA["vehicles"]
    cols = cfg["columns"]
    like_pattern = f"%{query_str.strip()}%"
    sql = text(
        f"SELECT * FROM {cfg['table']} "
        f"WHERE {cols['registration_number']} LIKE :pattern "
        f"OR {cols['vehicle_type']} LIKE :pattern "
        f"LIMIT :limit"
    )
    return _execute_many(sql, {"pattern": like_pattern, "limit": limit})


# ============================================================================
# Trip helpers
# ============================================================================
def get_trip(trip_id: Any) -> Optional[dict]:
    """Fetch a single trip by primary key. Returns None if not found."""
    cfg = SCHEMA["trips"]
    cols = cfg["columns"]
    query = text(f"SELECT * FROM {cfg['table']} WHERE {cols['id']} = :trip_id LIMIT 1")
    result = _execute_one(query, {"trip_id": trip_id})
    if result is None:
        logger.info("No trip found for trip_id=%r", trip_id)
    return result


def get_active_trip(driver_id: Optional[Any] = None, vehicle_id: Optional[Any] = None) -> Optional[dict]:
    """
    Fetch the current active trip for a driver and/or vehicle (status in
    ACTIVE_TRIP_STATUSES). At least one of driver_id / vehicle_id must be given.
    If both are given, both must match the same trip. Returns None if no
    active trip is found, or if neither filter is provided.
    """
    if driver_id is None and vehicle_id is None:
        logger.warning("get_active_trip called without driver_id or vehicle_id; returning None.")
        return None

    cfg = SCHEMA["trips"]
    cols = cfg["columns"]

    conditions = [f"{cols['status']} IN :active_statuses"]
    params: dict[str, Any] = {"active_statuses": tuple(ACTIVE_TRIP_STATUSES)}

    if driver_id is not None:
        conditions.append(f"{cols['driver_id']} = :driver_id")
        params["driver_id"] = driver_id
    if vehicle_id is not None:
        conditions.append(f"{cols['vehicle_id']} = :vehicle_id")
        params["vehicle_id"] = vehicle_id

    sql = text(
        f"SELECT * FROM {cfg['table']} "
        f"WHERE {' AND '.join(conditions)} "
        f"ORDER BY {cols['start_time']} DESC LIMIT 1"
    ).bindparams(bindparam("active_statuses", expanding=True))
    result = _execute_one(sql, params)
    if result is None:
        logger.info(
            "No active trip found for driver_id=%r vehicle_id=%r", driver_id, vehicle_id
        )
    return result