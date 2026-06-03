from fastapi import HTTPException, status, Request, Depends
from app.utils.redis import redis_client

RATE_LIMITS = {
    "login": (3, 60),
    "register": (3, 3600),
    "forgot_password": (3, 3600),
    "change_password": (10, 3600),
    "default": (200, 3600),
    "reset_password": (5, 60),
}

RATE_LIMIT_MESSAGES = {
    "login": "Too many login attempts. Please try again in {ttl} seconds.",
    "register": "Too many registration attempts. Please try again in {ttl} seconds.",
    "forgot_password": "Too many password reset attempts. Please try again in {ttl} seconds.",
    "default": "Too many requests. Please try again in {ttl} seconds.",
}


def rate_limit(limit_key: str):
    """
    Rate limiting dependency.
    Usage: Depends(rate_limit("login"))
    """
    async def check(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = f"rl:{limit_key}:{ip}"

        limit, window = RATE_LIMITS.get(limit_key, RATE_LIMITS["default"])

        current = await redis_client.incr(key)

        if current == 1:
            await redis_client.expire(key, window)

        if current > limit:
            ttl = await redis_client.ttl(key)
            message = RATE_LIMIT_MESSAGES.get(
                limit_key, RATE_LIMIT_MESSAGES["default"]
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=message.format(ttl=ttl)
            )

    return check