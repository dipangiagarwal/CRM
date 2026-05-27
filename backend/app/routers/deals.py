import uuid
from datetime import datetime, timezone, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.middleware.auth import verify_token, CurrentUser
from app.models.deal import Deal
from app.models.contact import Contact
from app.schemas.deal import DealCreate, DealUpdate, DealStageUpdate, DealResponse
from app.sockets.manager import emit_to_org

router = APIRouter(prefix="/deals", tags=["Deals"])


@router.post("/create_deal", status_code=status.HTTP_201_CREATED, response_model=DealResponse)
async def create_deal(
    data: DealCreate,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new deal linked to a contact.
    Verifies the contact belongs to the same org before linking.
    Prevents cross-tenant data linking.
    """

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

    deal = Deal(
        id=uuid.uuid4(),
        org_id=uuid.UUID(user.org_id),
        contact_id=data.contact_id,
        owner_id=uuid.UUID(user.user_id),
        title=data.title,
        value=data.value,
        stage=data.stage or "new",
        expected_close=data.expected_close if isinstance(data.expected_close, date) else None,
        probability=data.probability or 0,
        lost_reason=data.lost_reason,
        created_at=str(datetime.now(timezone.utc))
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return deal


@router.get("/list_all_deals", response_model=dict)
async def list_deals(
    stage: Optional[str] = Query(None, description="new|qualified|proposal|negotiation|won|lost"),
    owner_id: Optional[str] = Query(None),
    contact_id: Optional[str] = Query(None),
    min_value: Optional[float] = Query(None),
    max_value: Optional[float] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    List deals with filters.
    Supports filtering by stage for kanban view.
    Value range filter useful for sales reports.
    """

    query = select(Deal).where(
        Deal.org_id == uuid.UUID(user.org_id)
    )

    if stage:
        query = query.where(Deal.stage == stage)
    if owner_id:
        query = query.where(Deal.owner_id == uuid.UUID(owner_id))
    if contact_id:
        query = query.where(Deal.contact_id == uuid.UUID(contact_id))
    if min_value is not None:
        query = query.where(Deal.value >= min_value)
    if max_value is not None:
        query = query.where(Deal.value <= max_value)
    if cursor:
        query = query.where(Deal.id > uuid.UUID(cursor))

    sort_column = getattr(Deal, sort_by, Deal.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    query = query.limit(limit)

    result = await db.execute(query)
    deals = result.scalars().all()

    count_result = await db.execute(
        select(func.count()).where(
            Deal.org_id == uuid.UUID(user.org_id)
        )
    )
    total = count_result.scalar()
    next_cursor = str(deals[-1].id) if len(deals) == limit else None

    return {
        "deals": [DealResponse.model_validate(d) for d in deals],
        "total": total,
        "next_cursor": next_cursor,
        "has_more": next_cursor is not None
    }


@router.get("/get_deal_by_id/{deal_id}", response_model=DealResponse)
async def get_deal(
    deal_id: str,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Get single deal — org_id check ensures tenant isolation."""
    result = await db.execute(
        select(Deal).where(
            Deal.id == uuid.UUID(deal_id),
            Deal.org_id == uuid.UUID(user.org_id)
        )
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found"
        )
    return deal


@router.patch("/update_deal_by_id/{deal_id}", response_model=DealResponse)
async def update_deal(
    deal_id: str,
    data: DealUpdate,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Update deal fields — only provided fields updated."""
    result = await db.execute(
        select(Deal).where(
            Deal.id == uuid.UUID(deal_id),
            Deal.org_id == uuid.UUID(user.org_id)
        )
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deal, field, value)

    await db.commit()
    await db.refresh(deal)
    return deal


@router.patch("/update_deal_stage/{deal_id}/stage", response_model=DealResponse)
async def update_deal_stage(
    deal_id: str,
    data: DealStageUpdate,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Move deal to a new stage — used by kanban drag and drop.
    Separate endpoint because stage change is a significant CRM event.
    If stage is 'lost', lost_reason should be provided.
    """
    valid_stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
    if data.stage not in valid_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage. Must be one of: {valid_stages}"
        )

    result = await db.execute(
        select(Deal).where(
            Deal.id == uuid.UUID(deal_id),
            Deal.org_id == uuid.UUID(user.org_id)
        )
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found"
        )

    deal.stage = data.stage

    # Capture lost reason when deal is marked lost
    if data.stage == "lost" and data.lost_reason:
        deal.lost_reason = data.lost_reason

    # Auto set probability based on stage
    stage_probability = {
        "new": 10,
        "qualified": 25,
        "proposal": 50,
        "negotiation": 75,
        "won": 100,
        "lost": 0
    }
    deal.probability = stage_probability[data.stage]

    await db.commit()
    await db.refresh(deal)

    # Emit real-time update to all org users
    await emit_to_org(user.org_id, "deal_stage_changed", {
        "deal_id": str(deal.id),
        "title": deal.title,
        "old_stage": deal.stage,
        "new_stage": data.stage,
        "changed_by": user.first_name
    })

    return deal


@router.delete("/delete_deal_by_id/{deal_id}")
async def delete_deal(
    deal_id: str,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete — mark stage as lost instead of removing from DB."""
    result = await db.execute(
        select(Deal).where(
            Deal.id == uuid.UUID(deal_id),
            Deal.org_id == uuid.UUID(user.org_id)
        )
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found"
        )

    deal.stage = "deleted"
    await db.commit()

    return {"message": "Deal deleted successfully", "id": deal_id}