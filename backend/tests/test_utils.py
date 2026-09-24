"""Framework-agnostic helpers: sanitiser, rate limiter, HTTP cache, network, slugs, links, logging."""

import json
import logging
import sys

import pytest
from starlette.requests import Request

from app.core.logging import JsonFormatter, RequestIdFilter, configure_logging, request_id_var
from app.core.rate_limit import InMemoryRateLimiter, RateLimitRule
from app.schemas.common import ensure_unique, validate_link
from app.utils.datetime import ensure_utc, utcnow
from app.utils.http_cache import etag_matches, make_weak_etag
from app.utils.network import UNKNOWN_CLIENT, get_client_ip, hash_ip
from app.utils.sanitize import (
    count_urls,
    letter_ratio,
    remove_control_characters,
    sanitize_multiline,
    sanitize_single_line,
    strip_html,
)
from app.utils.slug import slugify

# Sanitiser ----------------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("<b>bold</b> text", "bold text"),
        ("before<script type='x'>alert(1)</script>after", "beforeafter"),
        ("<style>p{}</style>kept", "kept"),
        ("a <!-- hidden --> b", "a  b"),
        ("<!DOCTYPE html><p>x</p>", "x"),
        ("5 < 6 and 7 > 3", "5 < 6 and 7 > 3"),
        ("unterminated <!-- comment", "unterminated "),
    ],
)
def test_strip_html(raw: str, expected: str) -> None:
    assert strip_html(raw) == expected


def test_remove_control_characters() -> None:
    raw = "a\x00b\x07c\td\u202ee\u2066f\ng"

    assert remove_control_characters(raw) == "abc de" + "f\ng"
    assert remove_control_characters("x\ny", keep_newlines=False) == "xy"


def test_sanitize_multiline_collapses_blank_lines_and_trims() -> None:
    raw = "  Line 1   \r\nLine 2\r\rLine 3\n\n\n\n\n\nLine 4  "

    assert sanitize_multiline(raw) == "Line 1\nLine 2\n\nLine 3\n\n\nLine 4"


def test_sanitize_single_line() -> None:
    assert sanitize_single_line("  Jane\n\t <i>Doe</i>  ") == "Jane Doe"
    assert sanitize_single_line("Cafe\u0301") == "Café"


def test_spam_heuristics() -> None:
    assert count_urls("see https://a.example and www.b.example and http://c.example/x") == 3
    assert count_urls("no links here") == 0
    assert letter_ratio("") == 1.0
    assert letter_ratio("abc 123") == 0.5
    assert letter_ratio("Hello") == 1.0


# Rate limiting ------------------------------------------------------------------------------------------


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.mark.parametrize(
    ("value", "limit", "window"),
    [("5/hour", 5, 3600), ("10 / minutes", 10, 60), ("1/second", 1, 1), ("3/DAY", 3, 86400)],
)
def test_rate_limit_rule_parsing(value: str, limit: int, window: int) -> None:
    assert RateLimitRule.parse(value) == RateLimitRule(limit=limit, window_seconds=window)


@pytest.mark.parametrize("value", ["", "5", "0/hour", "five/hour", "5/fortnight"])
def test_invalid_rate_limit_rules(value: str) -> None:
    with pytest.raises(ValueError, match="Invalid rate limit"):
        RateLimitRule.parse(value)


def test_sliding_window_limiter() -> None:
    clock = Clock()
    limiter = InMemoryRateLimiter(clock=clock)
    rule = RateLimitRule(limit=2, window_seconds=60)

    assert limiter.hit("ip", rule).remaining == 1
    assert limiter.hit("ip", rule).remaining == 0
    blocked = limiter.hit("ip", rule)
    assert blocked.allowed is False
    assert blocked.retry_after == 60
    assert limiter.hit("other-ip", rule).allowed is True

    clock.now += 30
    assert limiter.hit("ip", rule).retry_after == 30
    clock.now += 31
    assert limiter.hit("ip", rule).allowed is True


def test_limiter_reset_forgets_everything() -> None:
    limiter = InMemoryRateLimiter(clock=Clock())
    rule = RateLimitRule(limit=1, window_seconds=3600)
    limiter.hit("ip", rule)

    limiter.reset()

    assert limiter.hit("ip", rule).allowed is True


def test_limiter_prunes_stale_keys() -> None:
    clock = Clock()
    limiter = InMemoryRateLimiter(clock=clock)
    rule = RateLimitRule(limit=5, window_seconds=10)
    limiter.hit("stale", rule)
    clock.now += 100

    for index in range(InMemoryRateLimiter._PRUNE_EVERY):
        limiter.hit(f"client-{index % 3}", rule)

    assert "stale" not in limiter._hits


# HTTP cache ---------------------------------------------------------------------------------------------


def test_weak_etags() -> None:
    etag = make_weak_etag(b"content")

    assert etag.startswith('W/"')
    assert etag.endswith('"')
    assert etag == make_weak_etag(b"content")
    assert etag != make_weak_etag(b"other")
    assert etag_matches(etag, etag)
    assert etag_matches(etag.removeprefix("W/"), etag)
    assert etag_matches(f'"x", {etag}', etag)
    assert etag_matches("*", etag)
    assert not etag_matches(None, etag)
    assert not etag_matches("", etag)
    assert not etag_matches('"x"', etag)


# Network ------------------------------------------------------------------------------------------------


def _request(headers: dict[str, str], client: tuple[str, int] | None = ("198.51.100.7", 1234)) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(key.lower().encode(), value.encode()) for key, value in headers.items()],
        "client": client,
    }
    return Request(scope)


def test_client_ip_ignores_forwarded_headers_by_default() -> None:
    request = _request({"X-Forwarded-For": "203.0.113.9"})

    assert get_client_ip(request, trust_proxy_headers=False) == "198.51.100.7"


def test_client_ip_behind_trusted_proxy() -> None:
    assert get_client_ip(
        _request({"X-Forwarded-For": "203.0.113.9, 10.0.0.1"}), trust_proxy_headers=True
    ) == ("203.0.113.9")
    assert (
        get_client_ip(_request({"X-Forwarded-For": "not-an-ip"}), trust_proxy_headers=True) == "198.51.100.7"
    )
    assert get_client_ip(_request({}, client=None), trust_proxy_headers=True) == UNKNOWN_CLIENT


def test_ip_hash_is_keyed_and_stable() -> None:
    digest = hash_ip("203.0.113.9", secret="k" * 32)

    assert len(digest) == 64
    assert digest == hash_ip("203.0.113.9", secret="k" * 32)
    assert digest != hash_ip("203.0.113.9", secret="j" * 32)
    assert "203.0.113.9" not in digest


# Slugs, links, dates ------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("Détection du cancer", "detection-du-cancer"),
        ("  AI / ML -- Systems  ", "ai-ml-systems"),
        ("***", ""),
    ],
)
def test_slugify(value: str, expected: str) -> None:
    assert slugify(value) == expected


def test_slugify_truncates_without_trailing_hyphen() -> None:
    assert slugify("abc def", max_length=4) == "abc"


@pytest.mark.parametrize(
    "value", ["/images/photo.webp", "https://github.com/x", "http://example.org/a?b=c", None]
)
def test_valid_links(value: str | None) -> None:
    assert validate_link(value) == value


@pytest.mark.parametrize(
    "value",
    ["javascript:alert(1)", "data:text/html,x", "//evil.example", "https://a b.example", "ftp://x.example"],
)
def test_invalid_links(value: str) -> None:
    with pytest.raises(ValueError, match="URL"):
        validate_link(value)


def test_ensure_unique_is_case_insensitive() -> None:
    assert ensure_unique(["NLP", "LLM"]) == ["NLP", "LLM"]
    with pytest.raises(ValueError, match="Duplicate entry"):
        ensure_unique(["NLP", "nlp"])


def test_datetimes_are_utc() -> None:
    naive = utcnow().replace(tzinfo=None)

    assert ensure_utc(naive).utcoffset() is not None
    assert ensure_utc(utcnow()).tzinfo is not None


# Logging ------------------------------------------------------------------------------------------------


def test_json_formatter_includes_request_id_and_extra_fields() -> None:
    record = logging.makeLogRecord(
        {"name": "app.test", "levelname": "INFO", "msg": "hello %s", "args": ("world",), "path": "/api"}
    )
    token = request_id_var.set("req-123")
    try:
        RequestIdFilter().filter(record)
    finally:
        request_id_var.reset(token)

    payload = json.loads(JsonFormatter().format(record))

    assert payload["message"] == "hello world"
    assert payload["request_id"] == "req-123"
    assert payload["path"] == "/api"
    assert payload["level"] == "INFO"


def test_json_formatter_renders_exceptions() -> None:
    try:
        raise RuntimeError("boom")
    except RuntimeError:
        record = logging.makeLogRecord({"msg": "failed", "exc_info": sys.exc_info()})

    assert "RuntimeError: boom" in json.loads(JsonFormatter().format(record))["exc_info"]


def test_configure_logging_is_idempotent() -> None:
    root = logging.getLogger()

    configure_logging("INFO", json_format=True)
    configure_logging("WARNING", json_format=False)

    ours = [handler for handler in root.handlers if type(handler).__name__ == "_AppLogHandler"]
    assert len(ours) == 1
    assert root.level == logging.WARNING
