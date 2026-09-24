"""Vercel build hook (scripts/vercel_build.py): migrations + content reload."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from scripts import vercel_build
from sqlalchemy import create_engine, func, select

from app.core.config import get_settings
from app.models.project import Project
from tests.support import TEST_SECRET_KEY, seed_projects


@pytest.fixture(autouse=True)
def _fresh_settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Iterator[None]:
    for name in (
        "DATABASE_URL",
        "POSTGRES_URL",
        "DATABASE_URL_UNPOOLED",
        "POSTGRES_URL_NON_POOLING",
        "VERCEL",
        "EMBEDDED_DATABASE",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("SECRET_KEY", TEST_SECRET_KEY)
    monkeypatch.setattr(vercel_build, "BUNDLED_SEED_FILE", tmp_path / "bundled" / "portfolio.json")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_without_database_only_the_seed_is_bundled(capsys: pytest.CaptureFixture[str]) -> None:
    assert vercel_build.main() == 0

    assert vercel_build.BUNDLED_SEED_FILE.read_bytes() == vercel_build.REPO_SEED_FILE.read_bytes()
    assert "embedded database" in capsys.readouterr().out


def test_migrates_and_loads_the_content_twice(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    database = tmp_path / "vercel.db"
    monkeypatch.setenv("POSTGRES_URL", "sqlite:///unused.db")  # overridden by the unpooled URL below
    monkeypatch.setenv("DATABASE_URL_UNPOOLED", f"sqlite:///{database.as_posix()}")

    assert vercel_build.main() == 0
    get_settings.cache_clear()
    assert vercel_build.main() == 0  # every deployment reloads the content idempotently

    engine = create_engine(f"sqlite:///{database.as_posix()}")
    with engine.connect() as connection:
        assert connection.scalar(select(func.count()).select_from(Project)) == len(seed_projects())
    engine.dispose()
