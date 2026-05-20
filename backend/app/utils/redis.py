# 3 — Redis Session Utility

import json
import redis.asyncio as aioredis
from app.config import settings

# Single Redis connection pool — reused across all requests
redis_client = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True
)

async def set_session(user_id: str, data: dict, expire_seconds: int = 900):
    """
    Store user session in Redis
    Key: session:{user_id}
    Expires in 15 min (same as access token)
    Avoids DB lookup on every request — huge performance win
    """
    await redis_client.setex(
        f"session:{user_id}",
        expire_seconds,
        json.dumps(data)
    )

async def get_session(user_id: str) -> dict | None:
    """
    Get user session from Redis
    Returns None if session expired or not found
    """
    data = await redis_client.get(f"session:{user_id}")
    return json.loads(data) if data else None

async def delete_session(user_id: str):
    """
    Delete session on logout
    Next request will be rejected immediately
    """
    await redis_client.delete(f"session:{user_id}")

async def blacklist_refresh_token(token: str, expire_seconds: int = 604800):
    """
    Blacklist a refresh token on logout
    Prevents reuse of old refresh tokens
    Expires after 7 days (same as refresh token TTL)
    """
    await redis_client.setex(
        f"blacklist:{token}",
        expire_seconds,
        "1"
    )

async def is_token_blacklisted(token: str) -> bool:
    """Check if refresh token was already logged out"""
    return await redis_client.exists(f"blacklist:{token}") == 1