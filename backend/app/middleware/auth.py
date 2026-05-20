import uuid
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.utils.jwt import decode_access_token
from app.utils.redis import get_session, set_session
from app.models.user import User
from app.models.organization import Organization

class CurrentUser:
    """Represents the authenticated user on every request"""
    def __init__(self, user_id: str, org_id: str, role: str,
                 email: str, first_name: str, last_name: str):
        self.user_id = user_id
        self.org_id = org_id
        self.role = role
        self.email = email
        self.first_name = first_name
        self.last_name = last_name

async def verify_token(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> CurrentUser:
    """
    Runs on every protected endpoint.
    Order of checks:
    1. Token exists in cookie
    2. Token signature valid + not expired
    3. Redis session exists (fast path — no DB)
    4. If Redis miss → check DB (user active + org active)
    5. Rebuild Redis session for next request
    """

    # 1. Get token from httpOnly cookie
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    # 2. Decode and verify JWT signature + expiry
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid"
        )

    user_id = payload.get("sub")
    org_id = payload.get("org_id")
    role = payload.get("role")

    # 3. Check Redis session — fast path (avoids DB on most requests)
    session = await get_session(user_id)
    if session:
        # Session hit — return immediately without DB query
        return CurrentUser(
            user_id=user_id,
            org_id=org_id,
            role=role,
            email=session["email"],
            first_name=session["first_name"],
            last_name=session["last_name"]
        )

    # 4. Redis miss — check DB (first request after login or session expired)
    user_result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = user_result.scalar_one_or_none()

    # User must exist and be active
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Organization must be active
    org_result = await db.execute(
        select(Organization).where(Organization.id == uuid.UUID(org_id))
    )
    org = org_result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization not found"
        )

    if org.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your organization has been suspended"
        )

    if org.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your organization subscription has been cancelled"
        )

    # 5. Rebuild Redis session for next 15 minutes
    await set_session(user_id, {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "org_id": str(user.org_id),
        "role": user.role,
        "is_active": user.is_active
    })

    return CurrentUser(
        user_id=user_id,
        org_id=org_id,
        role=role,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name
    )


async def require_admin(user: CurrentUser = Depends(verify_token)) -> CurrentUser:
    """Only org admin or platform admin can access"""
    if user.role not in ["admin", "platform_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user


async def require_manager(user: CurrentUser = Depends(verify_token)) -> CurrentUser:
    """Manager, admin, or platform admin can access"""
    if user.role not in ["manager", "admin", "platform_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required"
        )
    return user