"""Request body size limit (pure ASGI).

Requests announcing a larger ``Content-Length`` are rejected before the body is read; streamed bodies
are counted and cut off as soon as they exceed the limit.
"""

from starlette.datastructures import Headers
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

PAYLOAD_TOO_LARGE_DETAIL = "Request body is too large."


class RequestBodyTooLarge(HTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=413, detail=PAYLOAD_TOO_LARGE_DETAIL)


class BodySizeLimitMiddleware:
    def __init__(self, app: ASGIApp, *, max_body_bytes: int) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        limit = self.max_body_bytes
        content_length = Headers(scope=scope).get("content-length")
        if content_length is not None and content_length.isdigit() and int(content_length) > limit:
            response = JSONResponse({"detail": PAYLOAD_TOO_LARGE_DETAIL, "code": "payload_too_large"}, 413)
            await response(scope, receive, send)
            return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise RequestBodyTooLarge
            return message

        await self.app(scope, limited_receive, send)
