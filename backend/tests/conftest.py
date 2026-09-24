"""Shared fixtures.

* Database: SQLite in memory (``StaticPool``) by default, PostgreSQL when ``TEST_DATABASE_URL`` is set.
  The schema is created once per session; every test starts from empty tables.
* Content: loaded from ``database/seed/portfolio.json`` through the real seed functions.
* Application: a fresh app per test — hence a fresh in-memory rate limiter — bound to the test
  database, with the e-mail sender replaced by an in-memory fake.
"""

import os
from collections.abc import Callable, Iterator
from contextlib import ExitStack
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from tests.support import (
    EMAIL_ENABLED,
    TEST_DATABASE_URL,
    TEST_SECRET_KEY,
    FakeEmailSender,
    make_settings,
    reset_database,
)

# ``app.main`` builds a module-level application from the environment when it is imported.
os.environ.setdefault("SECRET_KEY", TEST_SECRET_KEY)

from app.core.config import Settings
from app.core.paths import REPO_SEED_FILE
from app.database.base import Base
from app.database.seed import SeedReport, run_seed
from app.database.session import build_engine, build_session_factory, session_scope
from app.main import create_app
from app.routers.dependencies import get_email_sender


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    if TEST_DATABASE_URL:
        test_engine = build_engine(make_settings().database_url)
    else:
        test_engine = build_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield test_engine
    Base.metadata.drop_all(test_engine)
    test_engine.dispose()


@pytest.fixture
def session_factory(engine: Engine) -> sessionmaker[Session]:
    reset_database(engine)
    return build_session_factory(engine)


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def seed(session_factory: sessionmaker[Session]) -> Callable[..., SeedReport]:
    """Run the real seed against the test database: ``seed(force=True, settings=...)``."""

    def run(*, force: bool = False, settings: Settings | None = None) -> SeedReport:
        with session_scope(session_factory) as session:
            return run_seed(session, settings or make_settings(), force=force, seed_file=REPO_SEED_FILE)

    return run


@pytest.fixture
def seeded(seed: Callable[..., SeedReport]) -> SeedReport:
    return seed()


@pytest.fixture
def fake_sender() -> FakeEmailSender:
    return FakeEmailSender()


@pytest.fixture
def make_app(session_factory: sessionmaker[Session], fake_sender: FakeEmailSender) -> Callable[..., FastAPI]:
    """Build an app on the test database; keyword arguments override settings."""

    def build(**settings_overrides: Any) -> FastAPI:
        app = create_app(make_settings(**settings_overrides), session_factory=session_factory)
        app.dependency_overrides[get_email_sender] = lambda: fake_sender
        return app

    return build


@pytest.fixture
def make_client(make_app: Callable[..., FastAPI]) -> Iterator[Callable[..., TestClient]]:
    """Build a started ``TestClient`` (lifespan run) for an app with the given settings overrides."""
    with ExitStack() as stack:

        def build(**settings_overrides: Any) -> TestClient:
            return stack.enter_context(TestClient(make_app(**settings_overrides)))

        yield build


@pytest.fixture
def client(seeded: SeedReport, make_client: Callable[..., TestClient]) -> TestClient:
    """Seeded database, contact form disabled (``EMAIL_PROVIDER=none``)."""
    return make_client()


@pytest.fixture
def contact_client(seeded: SeedReport, make_client: Callable[..., TestClient]) -> TestClient:
    """Seeded database, e-mail forwarding configured (contact form enabled)."""
    return make_client(**EMAIL_ENABLED)
