"""Application wiring: middleware, error handling, OpenAPI document and interactive docs."""

from collections.abc import Callable

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.security_headers import BASE_SECURITY_HEADERS, HSTS_VALUE

PRODUCTION_SECRET = "Zr8v3kQm0PwLx2NcT6yHb9UdA4sE7fJg1WqRiOeKlMnB"


def test_security_headers_on_every_response(client: TestClient) -> None:
    for path in ("/api/profile", "/api/does-not-exist", "/robots.txt"):
        response = client.get(path)
        for name, value in BASE_SECURITY_HEADERS.items():
            assert response.headers[name] == value
        assert "strict-transport-security" not in response.headers
        assert "content-security-policy" not in response.headers


def test_hsts_is_enabled_in_production(make_client: Callable[..., TestClient]) -> None:
    client = make_client(environment="production", secret_key=PRODUCTION_SECRET)

    assert client.get("/api/health").headers["strict-transport-security"] == HSTS_VALUE


@pytest.mark.parametrize("path", ["/api/docs", "/api/redoc"])
def test_docs_pages_get_a_relaxed_csp(client: TestClient, path: str) -> None:
    response = client.get(path)

    assert response.status_code == 200
    assert "cdn.jsdelivr.net" in response.headers["content-security-policy"]


def test_docs_can_be_disabled(make_client: Callable[..., TestClient]) -> None:
    client = make_client(docs_enabled=False)

    for path in ("/api/docs", "/api/redoc", "/api/openapi.json"):
        assert client.get(path).status_code == 404


def test_request_id_is_propagated_or_generated(client: TestClient) -> None:
    echoed = client.get("/api/health", headers={"X-Request-ID": "trace-123.abc"})
    replaced = client.get("/api/health", headers={"X-Request-ID": "bad id with spaces"})

    assert echoed.headers["x-request-id"] == "trace-123.abc"
    assert replaced.headers["x-request-id"] != "bad id with spaces"
    assert len(replaced.headers["x-request-id"]) == 32


def test_access_log_line_has_no_query_string(client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level("INFO", logger="app.access"):
        client.get("/api/projects?domain=NLP")

    [record] = [record for record in caplog.records if record.name == "app.access"]
    assert record.getMessage().startswith("method=GET path=/api/projects status=200")
    assert "NLP" not in record.getMessage()


def test_unknown_route_uses_the_error_body(client: TestClient) -> None:
    response = client.get("/api/unknown")

    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found", "code": "not_found"}
    assert response.headers["cache-control"] == "no-store"


def test_wrong_method_is_405(client: TestClient) -> None:
    response = client.delete("/api/projects")

    assert response.status_code == 405
    assert response.json()["code"] == "method_not_allowed"


def test_unexpected_errors_become_a_generic_500(
    make_app: Callable[..., FastAPI], caplog: pytest.LogCaptureFixture
) -> None:
    app = make_app()

    @app.get("/api/boom")
    def boom() -> None:
        raise RuntimeError("secret internal detail")

    with TestClient(app) as client:
        response = client.get("/api/boom")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error", "code": "internal_error"}
    assert "secret internal detail" not in response.text
    assert "x-request-id" in response.headers
    assert "RuntimeError: secret internal detail" in caplog.text


def test_cors_allows_configured_origins_only(client: TestClient) -> None:
    preflight = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }

    allowed = client.options("/api/contact", headers=preflight)
    denied = client.options("/api/contact", headers={**preflight, "Origin": "https://evil.example"})
    simple = client.get("/api/profile", headers={"Origin": "http://localhost:5173"})

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in allowed.headers["access-control-allow-methods"]
    assert "DELETE" not in allowed.headers["access-control-allow-methods"]
    assert denied.status_code == 400
    assert simple.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "ETag" in simple.headers["access-control-expose-headers"]


def test_lifespan_reports_the_contact_form_status(
    make_client: Callable[..., TestClient], caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("INFO", logger="app.main"):
        make_client(email_provider="smtp", email_to="owner@portfolio.test", log_level="INFO")
        make_client(log_level="INFO")

    assert "missing=EMAIL_FROM,SMTP_HOST" in caplog.text
    assert "reason=EMAIL_PROVIDER is none" in caplog.text


def test_default_app_owns_and_disposes_its_engine() -> None:
    from app.main import create_app
    from tests.support import make_settings

    app = create_app(make_settings(database_url="sqlite://"))

    with TestClient(app) as client:
        assert client.get("/api/health").json()["database"] == "connected"
    assert app.state.owned_engine is not None


# OpenAPI ------------------------------------------------------------------------------------------------


def test_openapi_documents_only_public_endpoints(client: TestClient) -> None:
    schema = client.get("/api/openapi.json").json()

    assert schema["info"]["title"] == "Youssra Boubakri — Portfolio API"
    assert set(schema["paths"]) == {
        "/api/health",
        "/api/portfolio",
        "/api/profile",
        "/api/education",
        "/api/experience",
        "/api/skills",
        "/api/projects",
        "/api/projects/{id_or_slug}",
        "/api/contact",
        "/robots.txt",
        "/sitemap.xml",
    }
    assert not any("admin" in path for path in schema["paths"])
    assert "securitySchemes" not in schema.get("components", {})
    assert {tag["name"] for tag in schema["tags"]} == {"health", "portfolio", "contact", "seo"}
    for path_item in schema["paths"].values():
        for operation in path_item.values():
            assert "security" not in operation
            assert operation["summary"]


def test_openapi_schemas_match_the_v2_contract(client: TestClient) -> None:
    schema = client.get("/api/openapi.json").json()
    components = schema["components"]["schemas"]

    summary = components["ProjectSummary"]
    for field in ("concepts", "visual", "github_url", "demo_url", "period_label"):
        assert field in summary["properties"]
        assert field in summary["required"]
    assert "contact_form_enabled" in components["ProfileRead"]["required"]
    assert "is_published" not in components["ProjectDetail"]["properties"]
    assert summary["examples"][0]["slug"] == "tsp-uav-optimization"

    contact = schema["paths"]["/api/contact"]["post"]
    assert set(contact["responses"]) >= {"201", "422", "429", "503"}
    assert contact["responses"]["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ValidationErrorResponse"
    }
    assert "HTTPValidationError" not in components


def test_openapi_document_is_cached(make_app: Callable[..., FastAPI]) -> None:
    app = make_app()

    assert app.openapi() is app.openapi()
