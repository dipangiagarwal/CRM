import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.middleware.auth import verify_token, CurrentUser
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.post("/create_contacts", status_code=status.HTTP_201_CREATED, response_model=ContactResponse)
async def create_contact(
    data: ContactCreate,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new contact.
    org_id always comes from the verified JWT token — never from request body.
    This prevents any cross-tenant data injection.
    """
    contact = Contact(
        id=uuid.uuid4(),
        org_id=uuid.UUID(user.org_id),
        owner_id=uuid.UUID(user.user_id),
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        company_name=data.company_name,
        lifecycle_stage=data.lifecycle_stage or "lead",
        lead_score=data.lead_score or 0,
        source=data.source,
        tags=data.tags or [],
        custom_fields=data.custom_fields or {},
        created_at=str(datetime.now(timezone.utc))
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/get_all_contacts", response_model=dict)
async def list_contacts(
    # Search
    search: Optional[str] = Query(None, description="Search by name, email, phone, company"),
    # Filters
    lifecycle_stage: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    # Sorting
    sort_by: str = Query("created_at", description="created_at | last_activity_at | lead_score | first_name"),
    sort_order: str = Query("desc", description="asc | desc"),
    # Cursor pagination — never use OFFSET
    cursor: Optional[str] = Query(None, description="Last contact ID from previous page"),
    limit: int = Query(20, ge=1, le=100),
    # Auth + DB
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    List contacts with search, filters, sorting and cursor pagination.
    org_id from token ensures company isolation — users only see their own contacts.
    Cursor pagination used instead of OFFSET for performance at scale.
    """

    # Base query — always scoped to org_id from token
    query = select(Contact).where(
        Contact.org_id == uuid.UUID(user.org_id)
    )

    # Search across multiple fields
    if search:
        query = query.where(
            or_(
                Contact.first_name.ilike(f"%{search}%"),
                Contact.last_name.ilike(f"%{search}%"),
                Contact.email.ilike(f"%{search}%"),
                Contact.phone.ilike(f"%{search}%"),
                Contact.company_name.ilike(f"%{search}%"),
            )
        )

    # Filters
    if lifecycle_stage:
        query = query.where(Contact.lifecycle_stage == lifecycle_stage)
    if owner_id:
        query = query.where(Contact.owner_id == uuid.UUID(owner_id))
    if source:
        query = query.where(Contact.source == source)

    # Cursor pagination — WHERE id > cursor instead of OFFSET
    if cursor:
        query = query.where(Contact.id > uuid.UUID(cursor))

    # Sorting
    sort_column = getattr(Contact, sort_by, Contact.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    query = query.limit(limit)

    result = await db.execute(query)
    contacts = result.scalars().all()

    # Total count for this org
    count_result = await db.execute(
        select(func.count()).where(
            Contact.org_id == uuid.UUID(user.org_id)
        )
    )
    total = count_result.scalar()

    # Next cursor for next page
    next_cursor = str(contacts[-1].id) if len(contacts) == limit else None

    return {
        "contacts": [ContactResponse.model_validate(c) for c in contacts],
        "total": total,
        "next_cursor": next_cursor,
        "has_more": next_cursor is not None
    }


@router.get("/get_contact_by_id/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Get single contact by ID.
    org_id check ensures users cannot access contacts from other companies.
    """
    result = await db.execute(
        select(Contact).where(
            Contact.id == uuid.UUID(contact_id),
            Contact.org_id == uuid.UUID(user.org_id)  # tenant isolation
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    return contact


@router.patch("/update_contact_by_id/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    data: ContactUpdate,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Update contact fields — only provided fields are updated.
    org_id check prevents updating contacts from other companies.
    """
    result = await db.execute(
        select(Contact).where(
            Contact.id == uuid.UUID(contact_id),
            Contact.org_id == uuid.UUID(user.org_id)
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    # Only update fields that were actually provided
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/delete_contact_by_id/{contact_id}", status_code=status.HTTP_200_OK)
async def delete_contact(
    contact_id: str,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Soft delete — we don't actually delete the contact from DB.
    We set lifecycle_stage to 'deleted' so data is preserved in audit history.
    Hard delete is never done — data loss is unacceptable in a CRM.
    """
    result = await db.execute(
        select(Contact).where(
            Contact.id == uuid.UUID(contact_id),
            Contact.org_id == uuid.UUID(user.org_id)
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    # Soft delete — mark as deleted, preserve data
    contact.lifecycle_stage = "deleted"
    await db.commit()

    return {"message": "Contact deleted successfully", "id": contact_id}