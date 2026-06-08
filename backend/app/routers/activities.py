import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth import verify_token, CurrentUser, require_write_access
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.deal import Deal
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse

router = APIRouter(prefix="/activities", tags=["Activities"])

VALID_TYPES = ["call", "email", "note", "meeting", "task", "message"]


@router.post("/create_activity", status_code=status.HTTP_201_CREATED, response_model=ActivityResponse)
async def create_activity(
    data: ActivityCreate,
    user: CurrentUser = Depends(require_write_access),
    db: AsyncSession = Depends(get_db)
):
    """
    Log a new activity against a contact.
    Optionally linked to a deal.
    Verifies contact and deal belong to same org before linking.
    Also updates contact's last_activity_at for sorting.
    """

    # Validate activity type
    if data.type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid type. Must be one of: {VALID_TYPES}"
        )

    # Verify contact belongs to same org
    contact_result = await db.execute(
        select(Contact).where(
            Contact.id == data.contact_id,
            Contact.org_id == uuid.UUID(user.org_id)
        )
    )
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found in your organization"
        )

    # Verify deal belongs to same org if provided
    if data.deal_id:
        deal_result = await db.execute(
            select(Deal).where(
                Deal.id == data.deal_id,
                Deal.org_id == uuid.UUID(user.org_id)
            )
        )
        deal = deal_result.scalar_one_or_none()
        if not deal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deal not found in your organization"
            )

    now = str(datetime.now(timezone.utc))

    activity = Activity(
        id=uuid.uuid4(),
        org_id=uuid.UUID(user.org_id),
        contact_id=data.contact_id,
        deal_id=data.deal_id,
        user_id=uuid.UUID(user.user_id),
        type=data.type,
        title=data.title,
        body=data.body,
        created_at=now
    )
    db.add(activity)

    # Update contact's last_activity_at — used for sorting contacts by recent activity
    contact.last_activity_at = now

    await db.commit()
    await db.refresh(activity)
    return activity


@router.get("/list_all_activities", response_model=dict)
async def list_activities(
    contact_id: Optional[str] = Query(None),
    deal_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    List activities for this org.
    Filter by contact or deal to show activity timeline.
    Always scoped to org_id from token.
    """

    query = select(Activity).where(
        Activity.org_id == uuid.UUID(user.org_id)
    )

    if contact_id:
        query = query.where(Activity.contact_id == uuid.UUID(contact_id))
    if deal_id:
        query = query.where(Activity.deal_id == uuid.UUID(deal_id))
    if type:
        query = query.where(Activity.type == type)
    if cursor:
        query = query.where(Activity.id > uuid.UUID(cursor))

    query = query.order_by(Activity.created_at.desc()).limit(limit)

    result = await db.execute(query)
    activities = result.scalars().all()

    count_result = await db.execute(
        select(func.count()).where(
            Activity.org_id == uuid.UUID(user.org_id)
        )
    )
    total = count_result.scalar()
    next_cursor = str(activities[-1].id) if len(activities) == limit else None

    return {
        "activities": [ActivityResponse.model_validate(a) for a in activities],
        "total": total,
        "next_cursor": next_cursor,
        "has_more": next_cursor is not None
    }


@router.get("/get_activity_by_id/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: str,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Get single activity — org_id check ensures tenant isolation."""
    result = await db.execute(
        select(Activity).where(
            Activity.id == uuid.UUID(activity_id),
            Activity.org_id == uuid.UUID(user.org_id)
        )
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    return activity


@router.patch("/update_activity_by_id/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: str,
    data: ActivityUpdate,
    user: CurrentUser = Depends(require_write_access),
    db: AsyncSession = Depends(get_db)
):
    """Update activity title or body only — type and contact cannot be changed."""
    result = await db.execute(
        select(Activity).where(
            Activity.id == uuid.UUID(activity_id),
            Activity.org_id == uuid.UUID(user.org_id)
        )
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(activity, field, value)

    await db.commit()
    await db.refresh(activity)
    return activity


@router.delete("/delete_activity_by_id/{activity_id}")
async def delete_activity(
    activity_id: str,
    user: CurrentUser = Depends(require_write_access),
    db: AsyncSession = Depends(get_db)
):
    """Hard delete for activities — logs are deletable unlike contacts/deals."""
    result = await db.execute(
        select(Activity).where(
            Activity.id == uuid.UUID(activity_id),
            Activity.org_id == uuid.UUID(user.org_id)
        )
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    await db.delete(activity)
    await db.commit()

    return {"message": "Activity deleted", "id": activity_id}