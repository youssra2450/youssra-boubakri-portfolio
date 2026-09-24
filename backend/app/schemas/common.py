"""Shared schema building blocks: base models, constrained string types, URL rules, error bodies."""

from datetime import datetime
from typing import Annotated, Any
from urllib.parse import urlsplit

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints

from app.utils.datetime import ensure_utc

ALLOWED_URL_SCHEMES = ("http", "https")


class ReadModel(BaseModel):
    """Response model populated from ORM objects.

    Every field is always present in responses, so the OpenAPI output schemas mark them all required
    (defaults included) — generated clients get exact, non-optional types.
    """

    model_config = ConfigDict(from_attributes=True, json_schema_serialization_defaults_required=True)


class InputModel(BaseModel):
    """Request / seed-file model: unknown fields rejected, surrounding whitespace stripped from strings."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


def _blank_to_none(value: object) -> object:
    return None if isinstance(value, str) and not value.strip() else value


def required_text(max_length: int, *, min_length: int = 1) -> Any:
    """Non-blank string type (whitespace-stripped) limited to ``max_length`` characters."""
    return Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)
    ]


def optional_text(max_length: int, *, pattern: str | None = None) -> Any:
    """Nullable string type; blank strings are stored as ``null``."""
    return Annotated[
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=max_length, pattern=pattern)]
        | None,
        BeforeValidator(_blank_to_none),
    ]


def validate_link(value: str | None) -> str | None:
    """Accept relative paths (``/images/x.webp``) or absolute ``http(s)://`` URLs; reject any other
    scheme (``javascript:``, ``data:`` …), protocol-relative URLs and embedded whitespace."""
    if value is None:
        return None
    if any(char.isspace() or ord(char) < 32 for char in value):
        raise ValueError("URL must not contain whitespace or control characters.")
    parts = urlsplit(value)
    if parts.scheme:
        if parts.scheme.lower() not in ALLOWED_URL_SCHEMES or not parts.netloc:
            raise ValueError("Absolute URLs must start with http:// or https://.")
    elif parts.netloc or value.startswith("//"):
        raise ValueError("Absolute URLs must start with http:// or https://.")
    return value


#: Optional URL (relative path or absolute http/https), max 500 characters.
OptionalLink = Annotated[optional_text(500), AfterValidator(validate_link)]
#: Required URL (relative path or absolute http/https), max 500 characters.
RequiredLink = Annotated[required_text(500), AfterValidator(validate_link)]

#: Datetime serialised with an explicit UTC offset, whatever the database driver returned.
UtcDateTime = Annotated[datetime, AfterValidator(ensure_utc)]

ListItem = required_text(1000)
Tag = required_text(100)
DisplayOrder = Annotated[int, Field(ge=0, le=100_000)]
Year = Annotated[int, Field(ge=1900, le=2100)]


def ensure_unique(values: list[str]) -> list[str]:
    """List validator: reject duplicate entries (compared case-insensitively)."""
    seen: set[str] = set()
    for value in values:
        key = value.casefold()
        if key in seen:
            raise ValueError(f"Duplicate entry: {value!r}.")
        seen.add(key)
    return values


class ErrorResponse(BaseModel):
    """Body of every error response."""

    detail: str = Field(description="Human readable message.")
    code: str = Field(description="Stable machine readable error code.")

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"detail": "Project not found.", "code": "not_found"}]}
    )


class FieldErrorItem(BaseModel):
    field: str = Field(description="Dotted path of the invalid field (e.g. `email`, `message`).")
    message: str


class ValidationErrorResponse(ErrorResponse):
    """Body of ``422`` responses."""

    errors: list[FieldErrorItem]

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "detail": "Validation error",
                    "code": "validation_error",
                    "errors": [{"field": "email", "message": "value is not a valid email address"}],
                }
            ]
        }
    )
