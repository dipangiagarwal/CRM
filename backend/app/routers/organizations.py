import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import verify_token, require_admin, CurrentUser
from app.models.organization import Organization
from app.services.storage import upload_file
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/me")
async def get_my_org(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Get current organization details."""
    result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

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
        "logo_url": org.logo_url,
        "created_at": org.created_at
    }


@router.post("/me/logo")
async def upload_logo(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload company logo — admin only.
    Stores in R2 and saves URL in organizations table.
    """

    # Validate image type
    allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Only images allowed (JPEG, PNG, WebP, SVG)"
        )

    # Max 2MB for logo
    file_bytes = await file.read()
    if len(file_bytes) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Logo must be under 2MB"
        )

    # Upload to R2
    result = await upload_file(
        file_bytes=file_bytes,
        filename=f"logo_{user.org_id}.{file.filename.split('.')[-1]}",
        org_id=user.org_id,
        mime_type=file.content_type
    )

    # Update org logo_url
    org_result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = org_result.scalar_one_or_none()
    org.logo_url = result["storage_path"]
    await db.commit()

    return {
        "message": "Logo uploaded successfully",
        "logo_url": result["storage_path"]
    }


@router.patch("/me")
async def update_org(
    name: str = None,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update organization details — admin only."""
    result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = result.scalar_one_or_none()
    if name:
        org.name = name
    await db.commit()
    return {"message": "Organization updated successfully"}


# onboarding flow
class OnboardingRequest(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None


VALID_INDUSTRIES = [
    "technology", "finance", "healthcare", "education",
    "retail", "manufacturing", "real_estate", "hospitality",
    "logistics", "media", "consulting", "other"
]

VALID_SIZES = [
    "1-10", "11-50", "51-200", "201-500", "500+"
]


@router.post("/onboarding")
async def complete_onboarding(
    data: OnboardingRequest,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Complete company onboarding — admin only.
    Called after first login and password change.
    Sets onboarding_completed = True.
    All fields optional — admin can skip.
    """
    result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = result.scalar_one_or_none()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Update only provided fields
    if data.company_name:
        org.name = data.company_name

    if data.industry:
        if data.industry not in VALID_INDUSTRIES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid industry. Choose from: {', '.join(VALID_INDUSTRIES)}"
            )
        org.industry = data.industry

    if data.company_size:
        if data.company_size not in VALID_SIZES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid size. Choose from: {', '.join(VALID_SIZES)}"
            )
        org.company_size = data.company_size

    # Mark onboarding complete
    org.onboarding_completed = True

    await db.commit()

    return {
        "message": "Onboarding completed successfully",
        "company_name": org.name,
        "industry": org.industry,
        "company_size": org.company_size,
        "onboarding_completed": True
    }


@router.get("/onboarding/status")
async def get_onboarding_status(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if onboarding is completed.
    Frontend checks this on every login.
    """
    result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = result.scalar_one_or_none()

    return {
        "onboarding_completed": org.onboarding_completed or False,
        "company_name": org.name,
        "industry": org.industry,
        "company_size": org.company_size
    }
