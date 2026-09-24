"""OpenAPI document: metadata and the project's error schema for ``422`` responses."""

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.schemas.common import ErrorResponse, ValidationErrorResponse

API_TITLE = "Youssra Boubakri — Portfolio API"

API_DESCRIPTION = """
Public REST API behind the professional portfolio of **Youssra Boubakri** — Data Scientist,
Data Engineer & Data Analyst (Morocco). It serves the portfolio content (profile, education,
experience, skills, projects) and forwards contact messages to the owner by e-mail.

There is no authentication: every endpoint is public. Content is maintained in
`database/seed/portfolio.json` and loaded with `python -m app.database.seed --force`.

### Conventions
* JSON in `snake_case`; timestamps in ISO 8601 (UTC); `null` means "not stated" (never a placeholder).
* Every error has the same body: `{"detail": "<message>", "code": "<machine_code>"}`. Validation errors
  (`422`) add `errors: [{"field", "message"}]`.
* Public `GET` endpoints return `Cache-Control: public, max-age=60` and a weak `ETag`; send it back in
  `If-None-Match` to get `304 Not Modified`.
* `POST /api/contact` is rate limited per client IP (`429` + `Retry-After`) and answers
  `503 contact_unavailable` while e-mail forwarding is not configured (`profile.contact_form_enabled`).
"""

OPENAPI_TAGS: list[dict[str, Any]] = [
    {"name": "health", "description": "Service and database status."},
    {"name": "portfolio", "description": "Public portfolio content (cached, ETag aware)."},
    {
        "name": "contact",
        "description": "Contact form: validated, sanitised, rate limited and forwarded by e-mail.",
    },
    {"name": "seo", "description": "`robots.txt` and `sitemap.xml` for crawlers."},
]

_VALIDATION_ERROR_REF = {"$ref": f"#/components/schemas/{ValidationErrorResponse.__name__}"}
_FASTAPI_DEFAULT_VALIDATION_SCHEMAS = ("HTTPValidationError", "ValidationError")


def install_openapi(app: FastAPI) -> None:
    """Replace ``app.openapi`` with a generator that documents the real ``422`` error body."""

    def build_schema() -> dict[str, Any]:
        if app.openapi_schema is None:
            schema = get_openapi(
                title=app.title,
                version=app.version,
                description=app.description,
                routes=app.routes,
                tags=app.openapi_tags,
            )
            _document_error_schemas(schema)
            app.openapi_schema = schema
        return app.openapi_schema

    app.openapi = build_schema  # type: ignore[method-assign]


def _document_error_schemas(schema: dict[str, Any]) -> None:
    components: dict[str, Any] = schema.setdefault("components", {}).setdefault("schemas", {})
    for model in (ErrorResponse, ValidationErrorResponse):
        model_schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        for name, definition in model_schema.pop("$defs", {}).items():
            components.setdefault(name, definition)
        components[model.__name__] = model_schema

    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            response = operation.get("responses", {}).get("422")
            if response is not None:
                response["description"] = "Validation error (`validation_error`)."
                response["content"] = {"application/json": {"schema": _VALIDATION_ERROR_REF}}

    for name in _FASTAPI_DEFAULT_VALIDATION_SCHEMAS:
        components.pop(name, None)
