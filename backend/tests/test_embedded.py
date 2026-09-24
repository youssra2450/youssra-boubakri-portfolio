"""Embedded database (no PostgreSQL) and startup diagnostics."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import create_app, create_unavailable_app, describe_startup_error
from tests.support import make_settings, seed_projects


def test_embedded_database_serves_the_seed_content(tmp_path: Path) -> None:
    settings = make_settings(
        database_url=f"sqlite:///{(tmp_path / 'embedded.sqlite3').as_posix()}", embedded_database=True
    )

    for _ in range(2):  # the second start reuses the populated file without duplicating rows
        with TestClient(create_app(settings)) as client:
            portfolio = client.get("/api/portfolio")
            health = client.get("/api/health")
        assert portfolio.status_code == 200
        assert len(portfolio.json()["projects"]) == len(seed_projects())
        assert health.json()["database"] == "connected"


def test_startup_errors_become_a_503_without_secrets() -> None:
    error = RuntimeError("connection to postgresql://owner:s3cret@db.example.test/app failed\nmore")

    with TestClient(create_unavailable_app(error)) as client:
        response = client.get("/api/health")
        other = client.post("/api/contact", json={})

    assert response.status_code == 503
    assert other.status_code == 503
    body = response.json()
    assert body["code"] == "startup_error"
    assert "s3cret" not in body["detail"]
    assert "://***@db.example.test" in body["detail"]
    assert "more" not in body["detail"]


def test_configuration_errors_list_only_field_names() -> None:
    with pytest.raises(ValidationError) as caught:
        make_settings(rate_limit_contact="often", secret_key="too-short-secret-value")

    description = describe_startup_error(caught.value)

    assert description.startswith("invalid configuration (")
    assert "too-short-secret-value" not in description
