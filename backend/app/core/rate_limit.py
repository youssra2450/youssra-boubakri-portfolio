"""Rate limiting primitives.

The API talks to a small :class:`RateLimiter` protocol so the in-memory implementation used by a
single-process deployment can be swapped for a shared store (e.g. Redis) without touching callers.
"""

import math
import re
import threading
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

_PERIOD_SECONDS = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}
_RULE_PATTERN = re.compile(r"^\s*(\d+)\s*/\s*(second|minute|hour|day)s?\s*$", re.IGNORECASE)


@dataclass(frozen=True)
class RateLimitRule:
    """``limit`` requests allowed per sliding window of ``window_seconds``."""

    limit: int
    window_seconds: int

    @classmethod
    def parse(cls, value: str) -> "RateLimitRule":
        """Parse ``"<count>/<second|minute|hour|day>"`` (e.g. ``"5/hour"``)."""
        match = _RULE_PATTERN.match(value)
        if match is None:
            raise ValueError(f"Invalid rate limit {value!r}: expected '<count>/<second|minute|hour|day>'")
        limit = int(match.group(1))
        if limit < 1:
            raise ValueError(f"Invalid rate limit {value!r}: count must be at least 1")
        return cls(limit=limit, window_seconds=_PERIOD_SECONDS[match.group(2).lower()])


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after: int
    """Seconds until the next request would be accepted (0 when allowed)."""


class RateLimiter(Protocol):
    def hit(self, key: str, rule: RateLimitRule) -> RateLimitResult:
        """Record one request for ``key`` and tell whether it is within ``rule``."""
        ...

    def reset(self) -> None:
        """Forget every recorded request (used between tests)."""
        ...


class InMemoryRateLimiter:
    """Thread-safe sliding-window-log limiter kept in process memory."""

    _PRUNE_EVERY = 1000

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._longest_window = 0
        self._calls_since_prune = 0

    def hit(self, key: str, rule: RateLimitRule) -> RateLimitResult:
        now = self._clock()
        window_start = now - rule.window_seconds
        with self._lock:
            self._longest_window = max(self._longest_window, rule.window_seconds)
            self._prune_if_due(now)
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= window_start:
                hits.popleft()
            if len(hits) >= rule.limit:
                retry_after = max(1, math.ceil(hits[0] + rule.window_seconds - now))
                return RateLimitResult(allowed=False, remaining=0, retry_after=retry_after)
            hits.append(now)
            return RateLimitResult(allowed=True, remaining=rule.limit - len(hits), retry_after=0)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
            self._calls_since_prune = 0

    def _prune_if_due(self, now: float) -> None:
        """Drop keys whose most recent hit is older than any configured window (bounded memory)."""
        self._calls_since_prune += 1
        if self._calls_since_prune < self._PRUNE_EVERY:
            return
        self._calls_since_prune = 0
        horizon = now - self._longest_window
        stale = [key for key, hits in self._hits.items() if not hits or hits[-1] <= horizon]
        for key in stale:
            del self._hits[key]
