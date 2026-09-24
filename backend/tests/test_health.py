from pathlib import Path

from fastapi.testclient import TestClient

from app.database.session import build_engine, build_session_factory
from app.main import create_app
from tests.support import make_settings


def test_health_reports_connected_database(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "portfolio-api"
    assert body["version"] == "1.0.0"
    assert body["database"] == "connected"
    assert body["timestamp"].endswith(("Z", "+00:00"))
    assert response.headers["cache-control"] == "no-store"


def _unreachable_app(tmp_path: Path) -> TestClient:
    unreachable = build_engine(f"sqlite:///{(tmp_path / 'missing' / 'db.sqlite').as_posix()}")
    return TestClient(create_app(make_settings(), session_factory=build_session_factory(unreachable)))


def test_health_is_degraded_when_the_database_is_unreachable(tmp_path: Path) -> None:
    with _unreachable_app(tmp_path) as client:
        response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
    assert response.json()["database"] == "unavailable"


def test_content_endpoints_return_503_when_the_database_is_unreachable(tmp_path: Path) -> None:
    with _unreachable_app(tmp_path) as client:
        response = client.get("/api/profile")

    assert response.status_code == 503
    assert response.json() == {"detail": "Service temporarily unavailable.", "code": "service_unavailable"}
    assert response.headers["retry-after"] == "30"
