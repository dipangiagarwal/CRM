import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from app.utils.rate_limit import rate_limit
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, ChangePasswordRequest
from app.utils.security import hash_password, verify_password
from app.utils.jwt import create_access_token, create_refresh_token, decode_refresh_token
from app.utils.redis import set_session, delete_session, blacklist_refresh_token, is_token_blacklisted, redis_client
from app.middleware.auth import verify_token, CurrentUser
from app.tasks.email import send_reset_email
from jose import JWTError
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


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


# @rate_limit("register")      these were not working
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit("register"))
):
    """
    Register a new organization and its first admin user.
    Steps:
    1. Check slug is unique
    2. Check email is unique
    3. Create organization
    4. Create first admin user
    5. Issue tokens immediately (auto-login after register)
    """

    slug_check = await db.execute(
        select(Organization).where(Organization.slug == data.company_slug)
    )
    if slug_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company URL already taken. Choose a different slug."
        )

    email_check = await db.execute(
        select(User).where(User.email == data.email)
    )
    if email_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    org = Organization(
        id=uuid.uuid4(),
        name=data.company_name,
        slug=data.company_slug,
        status="active",
        plan="starter",
        max_users=5,
    )
    db.add(org)
    await db.flush()

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

    from app.tasks.email import send_welcome_email
    send_welcome_email.delay(
        email=data.email,
        first_name=data.first_name,
        company_name=data.company_name
    )

    access_token = create_access_token(str(user.id), str(org.id), user.role)
    refresh_token = create_refresh_token(str(user.id))

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


# @rate_limit("login")
@router.post("/login")
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit("login"))
):
    """
    Login with email + password.
    Returns access + refresh tokens as httpOnly cookies.
    """

    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated"
        )

    org_result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = org_result.scalar_one_or_none()

    if not org or org.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your organization has been suspended. Contact support."
        )

    user.last_login_at = str(datetime.now(timezone.utc))
    await db.commit()

    access_token = create_access_token(str(user.id), str(user.org_id), user.role)
    refresh_token = create_refresh_token(str(user.id))

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
        "message": "Login successful",
        "user_id": str(user.id),
        "org_id": str(user.org_id),
        "role": user.role,
        "first_name": user.first_name,
        "tour_completed": user.tour_completed
    }


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Get new access token using refresh token cookie.
    Called automatically by frontend when access token expires.
    """

    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )

    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please login again."
        )

    try:
        payload = decode_refresh_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired. Please login again."
        )

    user_id = payload.get("sub")

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    new_access_token = create_access_token(
        str(user.id), str(user.org_id), user.role
    )

    await set_session(str(user.id), {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "org_id": str(user.org_id),
        "role": user.role,
        "is_active": True
    })

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
    """

    refresh_token = request.cookies.get("refresh_token")
    access_token = request.cookies.get("access_token")

    if refresh_token:
        await blacklist_refresh_token(refresh_token)

    if access_token:
        try:
            from app.utils.jwt import decode_access_token
            payload = decode_access_token(access_token)
            await delete_session(payload.get("sub"))
        except JWTError:
            pass

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"message": "Logged out successfully"}

# @rate_limit("change_password") 
@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit("change_password")) 
):
    """
    Change password — called on first login or voluntary change.
    Sets tour_completed = True after first password change.
    """

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user.user_id))
    )
    db_user = result.scalar_one_or_none()

    if not verify_password(data.old_password, db_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    db_user.password_hash = hash_password(data.new_password)

    if not db_user.tour_completed:
        db_user.tour_completed = True

    await db.commit()

    return {"message": "Password changed successfully"}


# @rate_limit("forgot_password")
@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit("forgot_password")) 
):
    """
    Send password reset link to email.
    Always return success — don't reveal if email exists.
    """

    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        return {"message": "If email exists, reset link has been sent"}

    token = str(uuid.uuid4())

    await redis_client.setex(
        f"reset:{token}",
        3600,
        str(user.id)
    )

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    send_reset_email.delay(
        email=user.email,
        first_name=user.first_name,
        reset_link=reset_link
    )

    return {"message": "If email exists, reset link has been sent"}


# @rate_limit("reset_password")
@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit("reset_password")) 
):
    """
    Reset password using token from email link.
    Token expires in 1 hour.
    Token deleted after use — cannot reuse.
    """

    user_id = await redis_client.get(f"reset:{data.token}")

    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link"
        )

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    await db.commit()

    await redis_client.delete(f"reset:{data.token}")

    return {"message": "Password reset successfully. Please login."}