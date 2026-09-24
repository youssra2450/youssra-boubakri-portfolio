"""Standard-library logging setup: human-readable lines in development, JSON lines in production.

Every record carries the current ``request_id`` (set by the request-context middleware).
"""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

PLAIN_FORMAT = "%(asctime)s %(levelname)-8s %(name)s [%(request_id)s] %(message)s"

#: Attributes present on every LogRecord; anything else was passed through ``extra=``.
_STANDARD_RECORD_ATTRS = frozenset(vars(logging.makeLogRecord({}))) | {"message", "asctime", "request_id"}


class RequestIdFilter(logging.Filter):
    """Inject the current request id into each record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line, including structured ``extra`` fields."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", request_id_var.get()),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_RECORD_ATTRS and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


class _AppLogHandler(logging.StreamHandler):  # type: ignore[type-arg]
    """Marker subclass so repeated configuration replaces (not duplicates) our handler."""


def configure_logging(level: str = "INFO", json_format: bool = False) -> None:
    """Install the application log handler on the root logger (idempotent)."""
    root = logging.getLogger()
    for handler in list(root.handlers):
        if isinstance(handler, _AppLogHandler):
            root.removeHandler(handler)

    handler = _AppLogHandler(sys.stdout)
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(JsonFormatter() if json_format else logging.Formatter(PLAIN_FORMAT))
    root.addHandler(handler)
    root.setLevel(level.upper())

    # Access lines are emitted by our own middleware (with request ids and durations).
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
