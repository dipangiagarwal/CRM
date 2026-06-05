import uuid
import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import verify_token, CurrentUser
from app.models.contact import Contact
from app.models.deal import Deal

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/contacts")
async def export_contacts(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all contacts as CSV.
    Admin and manager only.
    """
    org_id = uuid.UUID(user.org_id)

    result = await db.execute(
        select(Contact).where(Contact.org_id == org_id)
    )
    contacts = result.scalars().all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "First Name", "Last Name", "Email", "Phone",
        "Company", "Lifecycle Stage", "Lead Score",
        "Source", "Created At"
    ])

    # Data rows
    # Data rows
    for c in contacts:
        writer.writerow([
            c.first_name or "",
            c.last_name or "",
            c.email or "",
            c.phone or "",
            c.company_name or "",
            c.lifecycle_stage or "",
            c.lead_score or 0,
            c.source or "",
            c.created_at or ""
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=contacts_export.csv"
        }
    )


@router.get("/deals")
async def export_deals(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all deals as CSV.
    """
    org_id = uuid.UUID(user.org_id)

    result = await db.execute(
        select(Deal).where(Deal.org_id == org_id)
    )
    deals = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Title", "Stage", "Value",
        "Expected Close", "Probability",
        "Lost Reason", "Created At"
    ])

    # Data rows
    for d in deals:
        writer.writerow([
            d.title or "",
            d.stage or "",
            d.value or 0,
            d.expected_close or "",
            d.probability or 0,
            d.lost_reason or "",
            d.created_at or ""
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=deals_export.csv"
        }
    )