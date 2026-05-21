import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.config import settings
from app.models.organization import Organization
from app.models.user import User
from app.models.billing import Billing

router = APIRouter(prefix="/platform", tags=["Platform Admin"])


async def verify_platform_admin(
    x_platform_key: str = Header(..., alias="X-Platform-Key")
):
    """
    Platform admin uses a secret key in header — completely separate from JWT.
    This key is only known to you — never exposed to tenants.
    """
    if x_platform_key != settings.PLATFORM_ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid platform admin key"
        )
    return True


@router.get("/organizations")
async def list_all_organizations(
    _: bool = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    See all companies on your platform.
    Shows plan, status, user count for each.
    """
    result = await db.execute(
        select(Organization).order_by(Organization.created_at.desc())
    )
    orgs = result.scalars().all()

    org_list = []
    for org in orgs:
        # Get user count for each org
        count_result = await db.execute(
            select(func.count()).where(
                User.org_id == org.id,
                User.is_active == True
            )
        )
        user_count = count_result.scalar()

        org_list.append({
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "status": org.status,
            "plan": org.plan,
            "sub_end": str(org.sub_end) if org.sub_end else None,
            "max_users": org.max_users,
            "active_users": user_count,
            "created_at": org.created_at
        })

    return {
        "organizations": org_list,
        "total": len(org_list)
    }


@router.get("/organizations/{org_id}")
async def get_organization(
    org_id: str,
    _: bool = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get full details of a specific company."""
    result = await db.execute(
        select(Organization).where(Organization.id == uuid.UUID(org_id))
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get all users
    users_result = await db.execute(
        select(User).where(User.org_id == uuid.UUID(org_id))
    )
    users = users_result.scalars().all()

    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "status": org.status,
        "plan": org.plan,
        "sub_end": str(org.sub_end) if org.sub_end else None,
        "grace_until": str(org.grace_until) if org.grace_until else None,
        "max_users": org.max_users,
        "modules": org.modules,
        "created_at": org.created_at,
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role,
                "is_active": u.is_active,
                "last_login_at": u.last_login_at
            }
            for u in users
        ]
    }


@router.patch("/organizations/{org_id}/suspend")
async def suspend_organization(
    org_id: str,
    _: bool = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Suspend a company — all their users blocked immediately.
    verify_token checks org.status on every request.
    So this takes effect on the very next request from any user in that org.
    """
    result = await db.execute(
        select(Organization).where(Organization.id == uuid.UUID(org_id))
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if org.status == "suspended":
        raise HTTPException(
            status_code=400,
            detail="Organization is already suspended"
        )

    org.status = "suspended"
    await db.commit()

    return {
        "message": f"{org.name} has been suspended",
        "org_id": org_id,
        "status": "suspended"
    }


@router.patch("/organizations/{org_id}/activate")
async def activate_organization(
    org_id: str,
    _: bool = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reactivate a suspended company — takes effect immediately."""
    result = await db.execute(
        select(Organization).where(Organization.id == uuid.UUID(org_id))
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.status = "active"
    await db.commit()

    return {
        "message": f"{org.name} has been activated",
        "org_id": org_id,
        "status": "active"
    }


@router.get("/organizations/{org_id}/billing")
async def get_org_billing(
    org_id: str,
    _: bool = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """See all billing history for a specific company."""
    result = await db.execute(
        select(Billing).where(
            Billing.org_id == uuid.UUID(org_id)
        ).order_by(Billing.created_at.desc())
    )
    records = result.scalars().all()

    return {
        "org_id": org_id,
        "billing": [
            {
                "id": str(r.id),
                "amount": float(r.amount),
                "plan": r.plan,
                "status": r.status,
                "period_start": str(r.period_start) if r.period_start else None,
                "period_end": str(r.period_end) if r.period_end else None,
                "razorpay_payment_id": r.razorpay_payment_id,
                "created_at": r.created_at
            }
            for r in records
        ]
    }


@router.get("/stats")
async def platform_stats(
    _: bool = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Platform wide stats — your dashboard as Pixel CRM owner.
    Total orgs, active orgs, total users across all companies.
    """
    total_orgs = await db.execute(select(func.count()).select_from(Organization))
    active_orgs = await db.execute(
        select(func.count()).where(Organization.status == "active")
    )
    suspended_orgs = await db.execute(
        select(func.count()).where(Organization.status == "suspended")
    )
    total_users = await db.execute(select(func.count()).select_from(User))
    active_users = await db.execute(
        select(func.count()).where(User.is_active == True)
    )

    return {
        "total_organizations": total_orgs.scalar(),
        "active_organizations": active_orgs.scalar(),
        "suspended_organizations": suspended_orgs.scalar(),
        "total_users": total_users.scalar(),
        "active_users": active_users.scalar(),
    }