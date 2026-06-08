import uuid
import razorpay
import hmac
import hashlib
import json
from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import verify_token, require_admin, CurrentUser
from app.models.billing import Billing
from app.models.organization import Organization
from app.schemas.billing import CreateOrderRequest, BillingResponse
from pydantic import BaseModel
from app.config import settings

router = APIRouter(prefix="/billing", tags=["Billing"])

# Plan prices in paise (1 rupee = 100 paise)
PLAN_PRICES = {
    "starter": 29900,    # ₹299/month
    "growth": 59900,     # ₹599/month
    "enterprise": 99900 # ₹999/month
}

PLAN_MAX_USERS = {
    "starter": 99999,
    "growth": 99999,
    "enterprise": 99999
}


@router.post("/create-order")
async def create_order(
    data: CreateOrderRequest,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Razorpay order for the selected plan.
    Frontend uses this order_id to open Razorpay checkout modal.
    Amount is always server-side — never trust client-side amount.
    """

    if data.plan not in PLAN_PRICES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan. Choose: starter, growth, enterprise"
        )

    amount = PLAN_PRICES[data.plan]

    # Create Razorpay order
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )

    try:
        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "notes": {
                "tenant_id": user.org_id,
                "plan": data.plan,
                "user_id": user.user_id
            }
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create payment order: {str(e)}"
        )

    # Save pending billing record
    billing = Billing(
        id=uuid.uuid4(),
        org_id=uuid.UUID(user.org_id),
        razorpay_order_id=order["id"],
        amount=amount / 100,  # convert paise to rupees
        plan=data.plan,
        status="pending",
        created_at=str(datetime.now(timezone.utc))
    )
    db.add(billing)
    await db.commit()

    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "plan": data.plan,
        "razorpay_key": settings.RAZORPAY_KEY_ID
    }


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

@router.post("/verify-payment")
async def verify_payment(
    data: VerifyPaymentRequest,
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify signature synchronously for fast frontend update.
    """
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': data.razorpay_order_id,
            'razorpay_payment_id': data.razorpay_payment_id,
            'razorpay_signature': data.razorpay_signature
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    billing_result = await db.execute(
        select(Billing).where(Billing.razorpay_order_id == data.razorpay_order_id)
    )
    billing = billing_result.scalar_one_or_none()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing record not found")

    if billing.status == "paid":
        return {"status": "already_verified"}

    # Activate
    from app.routers.webhook import activate_subscription
    await activate_subscription(
        tenant_id=user.org_id,
        amount=int(billing.amount * 100),
        plan=billing.plan,
        payment_id=data.razorpay_payment_id,
        order_id=data.razorpay_order_id
    )

    return {"status": "success"}


@router.get("/history", response_model=list[BillingResponse])
async def billing_history(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """Get all billing records for this org."""
    result = await db.execute(
        select(Billing).where(
            Billing.org_id == uuid.UUID(user.org_id),
            Billing.status != 'pending'
        ).order_by(Billing.created_at.desc())
    )
    records = result.scalars().all()
    return records


@router.get("/status")
async def billing_status(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current subscription status for this org.
    Frontend shows this on billing page — plan, expiry, grace period.
    """
    org_result = await db.execute(
        select(Organization).where(
            Organization.id == uuid.UUID(user.org_id)
        )
    )
    org = org_result.scalar_one_or_none()

    return {
        "plan": org.plan,
        "status": org.status,
        "sub_end": str(org.sub_end) if org.sub_end else None,
        "grace_until": str(org.grace_until) if org.grace_until else None,
        "max_users": org.max_users,
        "modules": org.modules
    }