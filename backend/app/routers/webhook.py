import uuid
import hmac
import hashlib
import json
from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.billing import Billing
from app.models.organization import Organization
from app.config import settings
from app.sockets.manager import emit_to_org

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

PLAN_MAX_USERS = {
    "starter": 99999,
    "growth": 99999,
    "enterprise": 99999
}


async def activate_subscription(
    tenant_id: str, amount: int, plan: str, payment_id: str, order_id: str
):
    """
    Activate subscription after successful payment.
    New period always starts from old sub_end — company never loses days.
    Grace period = sub_end + 3 days.
    """
    async with AsyncSessionLocal() as db:
        org_result = await db.execute(
            select(Organization).where(
                Organization.id == uuid.UUID(tenant_id)
            )
        )
        org = org_result.scalar_one_or_none()
        if not org:
            return

        today = date.today()
        if org.sub_end and org.sub_end > today:
            new_start = org.sub_end
        else:
            new_start = today

        new_end = new_start + timedelta(days=30)
        grace_until = new_end + timedelta(days=3)

        org.status = "active"
        org.plan = plan
        org.sub_end = new_end
        org.grace_until = grace_until
        org.max_users = PLAN_MAX_USERS.get(plan, 99999)

        billing_result = await db.execute(
            select(Billing).where(
                Billing.razorpay_order_id == order_id
            )
        )
        billing = billing_result.scalar_one_or_none()
        if billing:
            billing.status = "paid"
            billing.razorpay_payment_id = payment_id
            billing.period_start = new_start
            billing.period_end = new_end

        # Get admin email for receipt
        from app.models.user import User
        admin_result = await db.execute(
            select(User).where(
                User.org_id == uuid.UUID(tenant_id),
                User.role == "admin",
                User.is_active == True
            )
        )
        admin = admin_result.scalars().first()

        await db.commit()

    # Send payment receipt email in background
    if admin:
        from app.tasks.email import send_payment_receipt
        send_payment_receipt.delay(
            email=admin.email,
            first_name=admin.first_name,
            company_name=org.name,
            amount=amount / 100,
            plan=plan,
            sub_end=str(new_end)
        )

    # Emit payment success to org via Socket.io
    await emit_to_org(tenant_id, "payment_update", {
        "status": "success",
        "message": "Payment successful! Subscription activated.",
        "plan": plan,
        "sub_end": str(new_end)
    })


@router.post("/razorpay")
async def razorpay_webhook(request: Request):
    """
    Razorpay calls this endpoint automatically after payment events.
    STEP 1: Always verify signature first — reject fake webhooks.
    STEP 2: Handle payment event.
    STEP 3: Always return 200 to Razorpay — even on errors.
    """

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = json.loads(body)
    event = data.get("event")

    if event == "payment.captured":
        payment = data["payload"]["payment"]["entity"]
        tenant_id = payment["notes"].get("tenant_id")
        plan = payment["notes"].get("plan", "starter")
        payment_id = payment["id"]
        order_id = payment["order_id"]
        amount = payment["amount"]

        if tenant_id:
            await activate_subscription(
                tenant_id, amount, plan, payment_id, order_id
            )

    elif event == "payment.failed":
        payment = data["payload"]["payment"]["entity"]
        order_id = payment.get("order_id")

        async with AsyncSessionLocal() as db:
            billing_result = await db.execute(
                select(Billing).where(
                    Billing.razorpay_order_id == order_id
                )
            )
            billing = billing_result.scalar_one_or_none()
            if billing:
                billing.status = "failed"
                await db.commit()

    return {"status": "ok"}