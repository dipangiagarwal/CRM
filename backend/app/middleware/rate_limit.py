from fastapi import Request, HTTPException, status
from app.utils.rate_limit import check_rate_limit


def get_client_ip(request: Request) -> str:
    """Get client IP from request."""
    if request.client:
        return request.client.host
    return "unknown"


async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware.
    Checks rate limits before processing request.
    """
    
    # Skip rate limiting for health check
    if request.url.path == "/health":
        return await call_next(request)
    
    # Get endpoint name
    endpoint = request.url.path.replace("/api/v1", "")
    
    # Get unique key
    token = request.cookies.get("access_token")
    
    if token:
        try:
            from app.utils.jwt import decode_access_token
            payload = decode_access_token(token)
            key = f"user:{payload.get('sub')}"
        except:
            key = get_client_ip(request)
    else:
        key = get_client_ip(request)
    
    # Check rate limit
    try:
        await check_rate_limit(key, endpoint)
    except HTTPException as e:
        return e
    
    # Continue request
    response = await call_next(request)
    return response