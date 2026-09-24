"""Domain exceptions raised by services and mapped to HTTP responses in ``app.main``.

They carry a stable machine-readable ``code`` (part of the API contract) and a human ``detail``;
the HTTP status is decided by the web layer, not here.
"""

from collections.abc import Sequence
from dataclasses import dataclass


class AppError(Exception):
    """Base class of every expected, client-facing error."""

    code = "error"
    default_detail = "The request could not be processed."

    def __init__(self, detail: str | None = None, *, code: str | None = None) -> None:
        self.detail = detail or self.default_detail
        self.code = code or type(self).code
        super().__init__(self.detail)


class NotFoundError(AppError):
    code = "not_found"
    default_detail = "Resource not found."


class ServiceUnavailableError(AppError):
    """A feature is temporarily or deliberately unavailable (e.g. ``contact_unavailable``)."""

    code = "service_unavailable"
    default_detail = "Service temporarily unavailable."


class RateLimitExceeded(AppError):  # noqa: N818 - name fixed by the API specification
    code = "rate_limited"
    default_detail = "Too many requests. Please try again later."

    def __init__(self, retry_after: int, detail: str | None = None) -> None:
        super().__init__(detail)
        self.retry_after = retry_after


@dataclass(frozen=True)
class FieldError:
    field: str
    message: str


class ValidationError(AppError):
    """Business-rule validation failure reported per field (same shape as request validation errors)."""

    code = "validation_error"
    default_detail = "Validation error"

    def __init__(self, errors: Sequence[FieldError] = (), detail: str | None = None) -> None:
        super().__init__(detail)
        self.errors = list(errors)
