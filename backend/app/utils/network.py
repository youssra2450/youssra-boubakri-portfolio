"""Client network identity helpers."""

import hashlib
import hmac
import ipaddress

from starlette.requests import Request

UNKNOWN_CLIENT = "unknown"


def get_client_ip(request: Request, *, trust_proxy_headers: bool) -> str:
    """Client IP address.

    Behind a trusted reverse proxy (``TRUST_PROXY_HEADERS=true``) the first ``X-Forwarded-For`` entry
    is used; otherwise the socket peer address. Invalid forwarded values are ignored.
    """
    if trust_proxy_headers:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        candidate = forwarded_for.split(",")[0].strip()
        if candidate and _is_ip_address(candidate):
            return candidate
    return request.client.host if request.client else UNKNOWN_CLIENT


def hash_ip(ip: str, *, secret: str) -> str:
    """Keyed SHA-256 of an IP address (64 hex chars) — raw IPs are never stored."""
    return hmac.new(secret.encode("utf-8"), ip.encode("utf-8"), hashlib.sha256).hexdigest()


def _is_ip_address(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
    except ValueError:
        return False
    return True
