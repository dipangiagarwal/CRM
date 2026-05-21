import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth import verify_token, require_admin, CurrentUser
from app.models.user import User
from app.models.contact import Contact
from app.models.deal import Deal
from app.schemas.user import UserInvite, UserUpdate, RoleUpdate, TransferData, UserResponse
from app.utils.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])

VALID_ROLES = ["admin", "manager", "rep", "viewer"]


@router.get("/list_all_users", response_model=list[UserResponse])
async def list_users(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users in the org.
    Every user can see the team list.
    Always scoped to org_id from token.
    """
    result = await db.execute(
        select(User).where(
            User.org_id == uuid.UUID(user.org_id)
        ).order_by(User.created_at)
    )
    users = result.scalars().all()
    return users


@router.post("/invite_user", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def invite_user(
    data: UserInvite,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a new user to the org — admin only.
    Checks max_users seat limit before adding.
    New user gets a temporary password which they should change on first login.
    """

    # Check seat limit
    count_result = await db.execute(
        select(func.count()).where(
            User.org_id == uuid.UUID(user.org_id),
            User.is_active == True
        )
    )
    active_count = count_result.scalar()

    # Get org to check max_users
    from app.models.organization import Organization
    org_result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = org_result.scalar_one_or_none()

    if active_count >= org.max_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User seat limit reached ({org.max_users} users). Upgrade your plan to add more."
        )

    # Check email not already registered
    email_check = await db.execute(
        select(User).where(User.email == data.email)
    )
    if email_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate role
    if data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {VALID_ROLES}"
        )

    new_user = User(
        id=uuid.uuid4(),
        org_id=uuid.UUID(user.org_id),
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
        job_title=data.job_title,
        is_active=True,
        tour_completed=False,
        created_at=str(datetime.now(timezone.utc))
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Get current logged in user's full profile."""
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user.user_id))
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.patch("/update_me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Update own profile — name, job title, avatar."""
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user.user_id))
    )
    db_user = result.scalar_one_or_none()

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)

    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.patch("/{user_id}/update_role_by_id", response_model=UserResponse)
async def update_role(
    user_id: str,
    data: RoleUpdate,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Change a user's role — admin only.
    Guard: last admin cannot be demoted.
    This prevents org from being locked out.
    """

    if data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {VALID_ROLES}"
        )

    result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(user_id),
            User.org_id == uuid.UUID(user.org_id)
        )
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Last admin guard — prevent 0-admin lockout
    if target_user.role == "admin" and data.role != "admin":
        admin_count_result = await db.execute(
            select(func.count()).where(
                User.org_id == uuid.UUID(user.org_id),
                User.role == "admin",
                User.is_active == True
            )
        )
        admin_count = admin_count_result.scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last admin. Promote another user to admin first."
            )

    target_user.role = data.role
    await db.commit()
    await db.refresh(target_user)
    return target_user


@router.post("/{user_id}/transfer_data_by_user_id", status_code=status.HTTP_200_OK)
async def transfer_data(
    user_id: str,
    data: TransferData,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Transfer all contacts and deals from one user to another.
    Must be done before deactivating a user.
    Ensures no data is orphaned when a rep leaves.
    """

    # Verify source user belongs to org
    source_result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(user_id),
            User.org_id == uuid.UUID(user.org_id)
        )
    )
    source_user = source_result.scalar_one_or_none()
    if not source_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify target user belongs to same org
    target_result = await db.execute(
        select(User).where(
            User.id == data.to_user_id,
            User.org_id == uuid.UUID(user.org_id)
        )
    )
    target_user = target_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found in your organization")

    # Transfer all contacts
    contacts_result = await db.execute(
        select(Contact).where(
            Contact.owner_id == uuid.UUID(user_id),
            Contact.org_id == uuid.UUID(user.org_id)
        )
    )
    contacts = contacts_result.scalars().all()
    for contact in contacts:
        contact.owner_id = data.to_user_id

    # Transfer all deals
    deals_result = await db.execute(
        select(Deal).where(
            Deal.owner_id == uuid.UUID(user_id),
            Deal.org_id == uuid.UUID(user.org_id)
        )
    )
    deals = deals_result.scalars().all()
    for deal in deals:
        deal.owner_id = data.to_user_id

    await db.commit()

    return {
        "message": "Data transferred successfully",
        "contacts_transferred": len(contacts),
        "deals_transferred": len(deals)
    }


@router.patch("/{user_id}/edit_user/deactivate_user", response_model=UserResponse)
async def deactivate_user(
    user_id: str,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Deactivate a user — admin only.
    Sets is_active=False — blocked immediately on next request.
    Cannot deactivate yourself.
    Cannot deactivate last admin.
    """

    # Cannot deactivate yourself
    if user_id == user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )

    result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(user_id),
            User.org_id == uuid.UUID(user.org_id)
        )
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Last admin guard
    if target_user.role == "admin":
        admin_count_result = await db.execute(
            select(func.count()).where(
                User.org_id == uuid.UUID(user.org_id),
                User.role == "admin",
                User.is_active == True
            )
        )
        admin_count = admin_count_result.scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last admin."
            )

    target_user.is_active = False
    await db.commit()
    await db.refresh(target_user)

    # Delete Redis session immediately — blocks user on next request
    # Without this, user stays active until their 15 min token expires
    from app.utils.redis import delete_session
    await delete_session(user_id)

    return target_user


@router.patch("/{user_id}/edit_user/activate_user", response_model=UserResponse)
async def activate_user(
    user_id: str,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reactivate a previously deactivated user — admin only."""
    result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(user_id),
            User.org_id == uuid.UUID(user.org_id)
        )
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.is_active = True
    await db.commit()
    await db.refresh(target_user)
    return target_user