"""Request id propagation, structured access logging and last-resort error handling (pure ASGI)."""

import logging
import re
import time
import uuid

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import request_id_var

REQUEST_ID_HEADER = "X-Request-ID"
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

access_logger = logging.getLogger("app.access")
error_logger = logging.getLogger("app.errors")


def internal_error_response() -> JSONResponse:
    return JSONResponse({"detail": "Internal server error", "code": "internal_error"}, status_code=500)


class RequestContextMiddleware:
    """Accept (or create) ``X-Request-ID``, echo it on the response and log one access line per request.

    Access lines contain method, path, status, duration and request id only — never bodies, query
    strings or headers (no credentials in logs). Unhandled exceptions are logged with their traceback
    and turned into a generic ``500`` so internals are never exposed.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get(REQUEST_ID_HEADER, "")
        request_id = incoming if _VALID_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status_code = 500
        response_started = False

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code, response_started
            if message["type"] == "http.response.start":
                response_started = True
                status_code = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            error_logger.exception("unhandled_error method=%s path=%s", scope["method"], scope["path"])
            if response_started:
                raise
            await internal_error_response()(scope, receive, send_with_request_id)
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            access_logger.info(
                "method=%s path=%s status=%s duration_ms=%s",
                scope["method"],
                scope["path"],
                status_code,
                duration_ms,
                extra={
                    "method": scope["method"],
                    "path": scope["path"],
                    "status": status_code,
                    "duration_ms": duration_ms,
                },
            )
            request_id_var.reset(token)
