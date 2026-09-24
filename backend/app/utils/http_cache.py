"""Conditional GET support: weak ETags, ``If-None-Match`` handling and ``Cache-Control`` headers."""

import hashlib
import json
from typing import Any

from fastapi.encoders import jsonable_encoder
from starlette.requests import Request
from starlette.responses import Response

PUBLIC_MAX_AGE_SECONDS = 60


def make_weak_etag(content: bytes) -> str:
    return f'W/"{hashlib.sha256(content).hexdigest()[:32]}"'


def etag_matches(if_none_match: str | None, etag: str) -> bool:
    """Weak comparison as required for ``If-None-Match`` (RFC 9110 §13.1.2)."""
    if not if_none_match:
        return False
    if if_none_match.strip() == "*":
        return True
    wanted = _opaque_tag(etag)
    return any(_opaque_tag(candidate) == wanted for candidate in if_none_match.split(","))


def public_cache_headers(etag: str, max_age: int = PUBLIC_MAX_AGE_SECONDS) -> dict[str, str]:
    return {"ETag": etag, "Cache-Control": f"public, max-age={max_age}"}


def cached_response(
    request: Request,
    content: bytes,
    *,
    media_type: str,
    max_age: int = PUBLIC_MAX_AGE_SECONDS,
) -> Response:
    """Return ``content`` with ETag + Cache-Control, or an empty ``304`` when the client copy is fresh."""
    etag = make_weak_etag(content)
    headers = public_cache_headers(etag, max_age)
    if etag_matches(request.headers.get("if-none-match"), etag):
        return Response(status_code=304, headers=headers)
    return Response(content=content, media_type=media_type, headers=headers)


def cached_json_response(
    request: Request, payload: Any, *, max_age: int = PUBLIC_MAX_AGE_SECONDS
) -> Response:
    """Serialise ``payload`` (Pydantic models, lists, dicts) to compact JSON and apply conditional GET."""
    body = json.dumps(jsonable_encoder(payload), ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return cached_response(request, body, media_type="application/json", max_age=max_age)


def _opaque_tag(tag: str) -> str:
    tag = tag.strip()
    return tag[2:] if tag.startswith("W/") else tag
