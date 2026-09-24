"""Application factory: settings, database, middleware, exception handlers and routers."""

import logging
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import asdict
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.core import exceptions as errors
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.openapi import API_DESCRIPTION, API_TITLE, OPENAPI_TAGS, install_openapi
from app.core.rate_limit import InMemoryRateLimiter
from app.database.embedded import prepare_embedded_database
from app.database.session import build_engine, build_session_factory
from app.middleware.body_limit import BodySizeLimitMiddleware
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import contact, health, portfolio, seo

logger = logging.getLogger(__name__)

API_PREFIX = "/api"
#: The only request body is the contact form (at most ~25 KB of JSON).
MAX_REQUEST_BODY_BYTES = 64 * 1024

_STATUS_BY_ERROR: dict[type[errors.AppError], int] = {
    errors.NotFoundError: 404,
    errors.RateLimitExceeded: 429,
    errors.ValidationError: 422,
    errors.ServiceUnavailableError: 503,
}

_CODE_BY_HTTP_STATUS = {
    400: "bad_request",
    404: "not_found",
    405: "method_not_allowed",
    413: "payload_too_large",
    429: "rate_limited",
}

_REQUEST_LOCATIONS = frozenset({"body", "query", "path", "header", "cookie"})


def create_app(
    settings: Settings | None = None, *, session_factory: sessionmaker[Session] | None = None
) -> FastAPI:
    """Build the application.

    ``session_factory`` lets callers (tests) provide the database; by default an engine is created from
    ``DATABASE_URL`` and disposed on shutdown.
    """
    settings = settings or get_settings()
    configure_logging(settings.log_level, settings.log_json)

    owned_engine: Engine | None = None
    if session_factory is None:
        owned_engine = build_engine(settings.database_url)
        session_factory = build_session_factory(owned_engine)
        if settings.embedded_database:
            logger.warning("database=embedded (no DATABASE_URL): serving the seed content from SQLite")
            prepare_embedded_database(owned_engine, settings)
    if settings.secret_key_generated:
        logger.warning("SECRET_KEY is not set: using a random per-process value")

    docs_enabled = settings.docs_enabled
    app = FastAPI(
        title=API_TITLE,
        version=settings.app_version,
        description=API_DESCRIPTION,
        openapi_tags=OPENAPI_TAGS,
        openapi_url=f"{API_PREFIX}/openapi.json" if docs_enabled else None,
        docs_url=f"{API_PREFIX}/docs" if docs_enabled else None,
        redoc_url=f"{API_PREFIX}/redoc" if docs_enabled else None,
        swagger_ui_oauth2_redirect_url=None,
        swagger_ui_parameters={"displayRequestDuration": True},
        lifespan=_lifespan,
    )
    app.state.settings = settings
    app.state.session_factory = session_factory
    app.state.owned_engine = owned_engine
    app.state.rate_limiter = InMemoryRateLimiter()

    install_openapi(app)
    _register_exception_handlers(app)
    _register_middleware(app, settings)
    _register_routers(app)
    return app


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    logger.info(
        "startup service=%s version=%s environment=%s docs_enabled=%s",
        settings.app_name,
        settings.app_version,
        settings.environment,
        settings.docs_enabled,
    )
    _log_contact_form_status(settings)
    yield
    engine: Engine | None = app.state.owned_engine
    if engine is not None:
        engine.dispose()
    logger.info("shutdown service=%s", settings.app_name)


def _log_contact_form_status(settings: Settings) -> None:
    if settings.contact_form_enabled:
        logger.info("contact_form=enabled provider=%s", settings.email_provider)
    elif settings.email_provider == "none":
        logger.info("contact_form=disabled reason=EMAIL_PROVIDER is none")
    else:
        logger.warning(
            "contact_form=disabled reason=incomplete e-mail configuration provider=%s missing=%s",
            settings.email_provider,
            ",".join(settings.missing_email_settings),
        )


def _register_routers(app: FastAPI) -> None:
    for router in (health.router, portfolio.router, contact.router):
        app.include_router(router, prefix=API_PREFIX)
    app.include_router(seo.router)


def _register_middleware(app: FastAPI, settings: Settings) -> None:
    # Added innermost first: CORS ends up outermost so that every response (errors included) carries
    # the CORS headers, then security headers, then request context (ids, access log, 500 fallback).
    app.add_middleware(BodySizeLimitMiddleware, max_body_bytes=MAX_REQUEST_BODY_BYTES)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(SecurityHeadersMiddleware, hsts=settings.is_production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "If-None-Match"],
        expose_headers=["ETag", "Retry-After", "X-Request-ID", "Content-Disposition"],
        max_age=600,
    )


def _register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(errors.AppError, _app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _request_validation_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(OperationalError, _database_unavailable_handler)  # type: ignore[arg-type]


def _error_body(detail: str, code: str, field_errors: list[dict[str, str]] | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"detail": detail, "code": code}
    if field_errors is not None:
        body["errors"] = field_errors
    return body


def _status_for(exc: errors.AppError) -> int:
    for error_type in type(exc).__mro__:
        if error_type in _STATUS_BY_ERROR:
            return _STATUS_BY_ERROR[error_type]
    return 400


async def _app_error_handler(_request: Request, exc: errors.AppError) -> JSONResponse:
    headers: dict[str, str] = {}
    if isinstance(exc, errors.RateLimitExceeded):
        headers["Retry-After"] = str(exc.retry_after)
    field_errors = (
        [asdict(error) for error in exc.errors] if isinstance(exc, errors.ValidationError) else None
    )
    return JSONResponse(
        _error_body(exc.detail, exc.code, field_errors), status_code=_status_for(exc), headers=headers
    )


async def _request_validation_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    field_errors = [{"field": _field_path(error), "message": _error_message(error)} for error in exc.errors()]
    return JSONResponse(_error_body("Validation error", "validation_error", field_errors), status_code=422)


async def _http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    code = _CODE_BY_HTTP_STATUS.get(exc.status_code, "http_error")
    return JSONResponse(_error_body(detail, code), status_code=exc.status_code, headers=exc.headers)


async def _database_unavailable_handler(_request: Request, _exc: OperationalError) -> JSONResponse:
    logger.exception("database.unavailable")
    return JSONResponse(
        _error_body("Service temporarily unavailable.", "service_unavailable"),
        status_code=503,
        headers={"Retry-After": "30"},
    )


def _field_path(error: dict[str, Any]) -> str:
    """``("body", "email")`` → ``"email"``; nested locations are joined with dots."""
    location = [str(part) for part in error.get("loc", ())]
    if error.get("type") == "json_invalid" or not location:
        return "body"
    if location[0] in _REQUEST_LOCATIONS and len(location) > 1:
        location = location[1:]
    return ".".join(location)


def _error_message(error: dict[str, Any]) -> str:
    message = str(error.get("msg", "Invalid value."))
    return message.removeprefix("Value error, ")


_CREDENTIALS_IN_URL = re.compile(r"://[^@/\s]+@")


def describe_startup_error(error: Exception) -> str:
    """Short, secret-free description of why the application could not start."""
    if isinstance(error, PydanticValidationError):
        fields = sorted(
            {".".join(str(part) for part in item["loc"]) or "settings" for item in error.errors()}
        )
        return f"invalid configuration ({', '.join(fields)})"
    first_line = (str(error).splitlines() or [""])[0][:200]
    return f"{type(error).__name__}: {_CREDENTIALS_IN_URL.sub('://***@', first_line)}".rstrip(": ")


def create_unavailable_app(error: Exception) -> FastAPI:
    """Fallback served when ``create_app`` fails: every request gets a 503 explaining the problem, instead
    of the process crashing with an opaque platform error."""
    reason = describe_startup_error(error)
    fallback = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @fallback.api_route("/{path:path}", methods=["GET", "HEAD", "POST", "OPTIONS"], include_in_schema=False)
    async def unavailable(path: str) -> JSONResponse:
        return JSONResponse(
            _error_body(f"The API could not start: {reason}", "startup_error"),
            status_code=503,
            headers={"Retry-After": "60"},
        )

    return fallback


try:
    app = create_app()
except Exception as startup_error:  # keep answering with a diagnostic rather than crashing
    logger.exception("startup.failed")
    app = create_unavailable_app(startup_error)
