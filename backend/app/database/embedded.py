"""Embedded database: a SQLite file created from the ORM models and filled from the seed file at startup.

Used when no PostgreSQL is configured (``EMBEDDED_DATABASE``; the default on Vercel until a database is
connected). The portfolio content is read-only and small, so a per-instance copy is enough to serve the
site; contact messages are not kept in this mode (the form is only enabled with e-mail forwarding).
"""

import logging

from sqlalchemy import Engine

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.core.config import Settings
from app.database.base import Base
from app.database.seed import run_seed
from app.database.session import build_session_factory

logger = logging.getLogger(__name__)


def prepare_embedded_database(engine: Engine, settings: Settings) -> None:
    """Create the tables if needed and load the seed into the tables that are still empty."""
    Base.metadata.create_all(engine)
    session = build_session_factory(engine)()
    try:
        report = run_seed(session, settings)
    finally:
        session.close()
    logger.info("embedded_database.ready inserted=%s", report.inserted or "nothing (already populated)")
