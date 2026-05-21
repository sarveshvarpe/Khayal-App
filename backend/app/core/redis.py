import redis.asyncio as redis
import time
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

redis_client = redis.Redis(
    host=settings.REDIS_HOST, 
    port=settings.REDIS_PORT, 
    decode_responses=True,
    socket_connect_timeout=1,
    socket_timeout=1
)

# In-memory fallback when Redis is unavailable
_memory_store: dict[str, tuple[str, float]] = {}


def _cleanup_expired():
    """Remove expired keys from memory store."""
    now = time.time()
    expired = [k for k, (_, exp) in _memory_store.items() if exp < now]
    for k in expired:
        del _memory_store[k]


async def get_redis():
    return redis_client


class OTPStore:
    """OTP store that uses Redis when available, falls back to in-memory."""

    @staticmethod
    async def set(key: str, value: str, ttl: int = 300):
        try:
            await redis_client.setex(key, ttl, value)
            return
        except Exception:
            logger.warning("Redis unavailable, using in-memory OTP store")

        _cleanup_expired()
        _memory_store[key] = (value, time.time() + ttl)

    @staticmethod
    async def get(key: str) -> str | None:
        try:
            result = await redis_client.get(key)
            if result is not None:
                return result
        except Exception:
            logger.warning("Redis unavailable, reading from in-memory OTP store")

        _cleanup_expired()
        entry = _memory_store.get(key)
        if entry:
            value, expiry = entry
            if time.time() < expiry:
                return value
            else:
                del _memory_store[key]
        return None

    @staticmethod
    async def delete(key: str):
        try:
            await redis_client.delete(key)
        except Exception:
            pass
        _memory_store.pop(key, None)


otp_store = OTPStore()
