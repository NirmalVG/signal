"""A token-bucket rate limiter, one bucket per key (we use one per user).

Each bucket holds up to `capacity` tokens and refills continuously. A request
spends one token. A burst up to the capacity is fine; a sustained rate above
the refill speed is refused with a hint of how long to wait.
"""
import math
import threading
import time

from .config import settings


class RateLimited(Exception):
    def __init__(self, retry_after: int) -> None:
        super().__init__(f"Too many requests, retry in {retry_after}s")
        self.retry_after = retry_after


class TokenBucket:
    def __init__(self, capacity: int, refill_per_second: float) -> None:
        self.capacity = capacity
        self.refill_per_second = refill_per_second
        self._state: dict[str, tuple[float, float]] = {}  # key -> (tokens, last_seen)
        self._lock = threading.Lock()

    def take(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            tokens, last_seen = self._state.get(key, (float(self.capacity), now))
            tokens = min(self.capacity, tokens + (now - last_seen) * self.refill_per_second)
            if tokens < 1:
                wait = math.ceil((1 - tokens) / self.refill_per_second)
                self._state[key] = (tokens, now)
                raise RateLimited(wait)
            self._state[key] = (tokens - 1, now)


limiter = TokenBucket(
    capacity=settings.rate_limit_per_minute,
    refill_per_second=settings.rate_limit_per_minute / 60,
)


def check_rate_limit(key: str) -> None:
    limiter.take(key)
