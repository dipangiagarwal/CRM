import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth import verify_token, require_admin, CurrentUser
from app.models.user import User
from app.models.contact import Contact
from app.models.deal import Deal
from app.schemas.user import UserInvite, UserUpdate, RoleUpdate, TransferData, UserResponse
from app.utils.security import hash_password
from app.sockets.manager import emit_to_user
from app.services.storage import upload_file

router = APIRouter(prefix="/users", tags=["Users"])

VALID_ROLES = ["super_admin", "admin", "manager", "developer", "executive", "rep", "viewer"]


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
        department=data.department if hasattr(data, 'department') else None,
        is_active=True,
        tour_completed=False,
        created_at=str(datetime.now(timezone.utc))
    )
    db.add(new_user)
    await db.commit()

    # Send invite email in background
    from app.tasks.email import send_invite_email
    send_invite_email.delay(
        email=data.email,
        first_name=data.first_name,
        company_name=org.name,
        temp_password=data.password
    )

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


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload user profile avatar.
    Stores in R2 and saves URL in users table.
    """
    # Validate image type
    allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Only images allowed (JPEG, PNG, WebP, SVG)"
        )

    # Max 2MB for avatar
    file_bytes = await file.read()
    if len(file_bytes) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Avatar must be under 2MB"
        )

    # Upload to R2
    result = await upload_file(
        file_bytes=file_bytes,
        filename=f"avatar_{user.user_id}.{file.filename.split('.')[-1]}",
        org_id=user.org_id,
        mime_type=file.content_type
    )

    # Update user avatar_url
    user_result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(user.user_id)
        )
    )
    db_user = user_result.scalar_one_or_none()
    db_user.avatar_url = result["storage_path"]
    
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

    # Emit to deactivated user → frontend will logout them
    await emit_to_user(user_id, "user_deactivated", {
        "message": "Your account has been deactivated"
    })

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


# bulk invite users  
import csv
import io
from fastapi import UploadFile, File

@router.post("/bulk-invite")
async def bulk_invite(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk invite users via CSV upload.
    CSV format: first_name,last_name,email,role,job_title
    Creates users and sends invite emails via Celery.
    """

    # Read CSV
    content = await file.read()
    csv_data = csv.DictReader(io.StringIO(content.decode("utf-8")))

    # Check seat limit
    count_result = await db.execute(
        select(func.count()).where(
            User.org_id == uuid.UUID(user.org_id),
            User.is_active == True
        )
    )
    current_count = count_result.scalar()

    from app.models.organization import Organization
    org_result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = org_result.scalar_one_or_none()

    created = []
    failed = []
    temp_password = "Welcome@1234"  # Default temp password

    for row in csv_data:
        try:
            email = row.get("email", "").strip()
            first_name = row.get("first_name", "").strip()
            last_name = row.get("last_name", "").strip()
            role = row.get("role", "rep").strip()
            job_title = row.get("job_title", "").strip()

            if not email or not first_name:
                failed.append({"email": email, "reason": "Missing required fields"})
                continue

            if role not in VALID_ROLES:
                failed.append({"email": email, "reason": f"Invalid role: {role}"})
                continue

            # Check seat limit
            if current_count >= org.max_users:
                failed.append({"email": email, "reason": "Seat limit reached"})
                continue

            # Check email exists
            email_check = await db.execute(
                select(User).where(User.email == email)
            )
            if email_check.scalar_one_or_none():
                failed.append({"email": email, "reason": "Email already exists"})
                continue

            department = row.get("department", "").strip()

            # Create user
            new_user = User(
                id=uuid.uuid4(),
                org_id=uuid.UUID(user.org_id),
                email=email,
                password_hash=hash_password(temp_password),
                first_name=first_name,
                last_name=last_name,
                role=role,
                job_title=job_title if job_title else None,
                department=department if department else None,
                is_active=True,
                tour_completed=False,
                created_at=str(datetime.now(timezone.utc))
            )
            db.add(new_user)
            current_count += 1
            created.append(email)

            # Send invite email via Celery
            from app.tasks.email import send_invite_email
            send_invite_email.delay(
                email=email,
                first_name=first_name,
                company_name=org.name,
                temp_password=temp_password
            )

        except Exception as e:
            failed.append({"email": row.get("email"), "reason": str(e)})

    await db.commit()

    return {
        "message": f"Bulk invite complete",
        "created": len(created),
        "failed": len(failed),
        "created_emails": created,
        "failed_details": failed
    }