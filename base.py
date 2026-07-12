"""
Declarative base shared by every ORM model in the TransitOps schema.
SQLAlchemy 2.0 style: models subclass `Base` (a `DeclarativeBase` subclass)
rather than using the legacy `declarative_base()` factory function.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all TransitOps ORM models."""
    pass
