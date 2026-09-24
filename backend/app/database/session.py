"""Engine and session management (synchronous SQLAlchemy 2.0).

The web application owns its engine (see ``app.main.create_app``); scripts such as the seed build their
own from ``DATABASE_URL``. Nothing here is global, so tests can inject any engine.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker


def build_engine(database_url: str, **engine_options: Any) -> Engine:
    """Create an engine; SQLite connections get foreign keys enforced (``ON DELETE CASCADE``)."""
    if database_url.startswith("sqlite"):
        connect_args = engine_options.pop("connect_args", {}) | {"check_same_thread": False}
        engine = create_engine(database_url, connect_args=connect_args, **engine_options)
        event.listen(engine, "connect", _enable_sqlite_foreign_keys)
        return engine
    return create_engine(database_url, pool_pre_ping=True, **engine_options)


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False)


@contextmanager
def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    """Transactional scope for scripts and background jobs: commit on success, rollback on error."""
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _enable_sqlite_foreign_keys(dbapi_connection: Any, _connection_record: Any) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
