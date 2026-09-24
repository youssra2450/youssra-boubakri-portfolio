"""Reusable OpenAPI response declarations (error bodies share ``ErrorResponse``)."""

from typing import Any

from app.schemas.common import ErrorResponse

ResponsesDict = dict[int | str, dict[str, Any]]


def _error(description: str, example: dict[str, str]) -> dict[str, Any]:
    return {
        "model": ErrorResponse,
        "description": description,
        "content": {"application/json": {"example": example}},
    }


NOT_FOUND: ResponsesDict = {
    404: _error("Resource not found (`not_found`).", {"detail": "Project not found.", "code": "not_found"})
}
RATE_LIMITED: ResponsesDict = {
    429: _error(
        "Too many requests (`rate_limited`); see the `Retry-After` header.",
        {"detail": "Too many requests. Please try again later.", "code": "rate_limited"},
    )
}
CONTACT_UNAVAILABLE: ResponsesDict = {
    503: _error(
        "E-mail forwarding is not configured, so the contact form is disabled (`contact_unavailable`).",
        {
            "detail": "The contact form is not available. Please reach out by e-mail or LinkedIn.",
            "code": "contact_unavailable",
        },
    )
}
NOT_MODIFIED: ResponsesDict = {
    304: {"description": "Not modified — the `If-None-Match` ETag is still current."}
}
