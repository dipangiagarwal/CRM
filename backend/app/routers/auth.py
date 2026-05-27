import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshResponse
from app.utils.security import hash_password, verify_password
from app.utils.jwt import create_access_token, create_refresh_token, decode_refresh_token
from app.utils.redis import set_session, delete_session, blacklist_refresh_token, is_token_blacklisted
from jose import JWTError
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """
    Set both tokens as httpOnly cookies.
    httpOnly = JavaScript cannot read them (XSS protection)
    Secure = only sent over HTTPS
    SameSite=strict = not sent on cross-site requests (CSRF protection)
    """
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Register a new organization and its first admin user.
    Steps:
    1. Check slug is unique (no duplicate companies)
    2. Check email is unique (no duplicate users)
    3. Create organization
    4. Create first admin user
    5. Issue tokens immediately (auto-login after register)
    """

    # Check slug uniqueness
    slug_check = await db.execute(
        select(Organization).where(Organization.slug == data.company_slug)
    )
    if slug_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company URL already taken. Choose a different slug."
        )

    # Check email uniqueness
    email_check = await db.execute(
        select(User).where(User.email == data.email)
    )
    if email_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create organization
    org = Organization(
        id=uuid.uuid4(),
        name=data.company_name,
        slug=data.company_slug,
        status="active",
        plan="starter",
        max_users=5,
    )
    db.add(org)
    await db.flush()  # get org.id before creating user

    # Create first admin user
    user = User(
        id=uuid.uuid4(),
        org_id=org.id,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role="admin",
        is_active=True,
        tour_completed=False,
        created_at=str(datetime.now(timezone.utc))
    )
    db.add(user)
    await db.commit()

    # Send welcome email in background — non-blocking
    from app.tasks.email import send_welcome_email
    send_welcome_email.delay(
        email=data.email,
        first_name=data.first_name,
        company_name=data.company_name
    )

    # Issue tokens — auto login after register
    access_token = create_access_token(str(user.id), str(org.id), user.role)
    refresh_token = create_refresh_token(str(user.id))

    # Cache session in Redis
    await set_session(str(user.id), {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "org_id": str(org.id),
        "role": user.role,
        "is_active": True
    })

    set_auth_cookies(response, access_token, refresh_token)

    return {
        "message": "Organization registered successfully",
        "user_id": str(user.id),
        "org_id": str(org.id),
        "role": user.role
    }


@router.post("/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Login with email + password.
    Returns access + refresh tokens as httpOnly cookies.
    Checks user is active and org is active before issuing tokens.
    """

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    # Generic error — don't reveal if email exists or not
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated"
        )

    # Check organization status
    org_result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = org_result.scalar_one_or_none()

    if not org or org.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your organization has been suspended. Contact support."
        )

    # Update last login time
    user.last_login_at = str(datetime.now(timezone.utc))
    await db.commit()

    # Create both tokens
    access_token = create_access_token(str(user.id), str(user.org_id), user.role)
    refresh_token = create_refresh_token(str(user.id))

    # Cache session in Redis for fast auth on subsequent requests
    await set_session(str(user.id), {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "org_id": str(user.org_id),
        "role": user.role,
        "is_active": True
    })

    set_auth_cookies(response, access_token, refresh_token)

    return {
        "message": "Login successfully",
        "user_id": str(user.id),
        "org_id": str(user.org_id),
        "role": user.role,
        "first_name": user.first_name,
        "tour_completed": user.tour_completed
    }


@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Get a new access token using the refresh token cookie.
    Called automatically by frontend when access token expires (every 15 min).
    Checks refresh token is not blacklisted (logged out tokens).
    """

    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )

    # Check if this refresh token was blacklisted (used after logout)
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please login again."
        )

    # Decode and verify refresh token
    try:
        payload = decode_refresh_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired. Please login again."
        )

    user_id = payload.get("sub")

    # Get fresh user data from DB
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    # Issue new access token with fresh role data
    new_access_token = create_access_token(
        str(user.id), str(user.org_id), user.role
    )

    # Rebuild Redis session
    await set_session(str(user.id), {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "org_id": str(user.org_id),
        "role": user.role,
        "is_active": True
    })

    # Set new access token cookie — refresh token stays the same
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {"message": "Token refreshed successfully"}


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Logout — clear both cookies and blacklist refresh token.
    After this, neither token works even if someone copied them.
    """

    refresh_token = request.cookies.get("refresh_token")
    access_token = request.cookies.get("access_token")

    # Blacklist the refresh token so it cannot be reused
    if refresh_token:
        await blacklist_refresh_token(refresh_token)

    # Delete Redis session immediately
    if access_token:
        try:
            from app.utils.jwt import decode_access_token
            payload = decode_access_token(access_token)
            await delete_session(payload.get("sub"))
        except JWTError:
            pass  # token already expired — session already gone

    # Clear both cookies from browser
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"message": "Logged out successfully"}