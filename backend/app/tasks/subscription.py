from datetime import date, timedelta
from sqlalchemy import select
from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.organization import Organization
import asyncio


def run_async(coro):
    """Helper to run async code in Celery sync context"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.subscription.check_expiring_subscriptions")
def check_expiring_subscriptions():
    """
    Runs daily at 9 AM.
    Finds orgs expiring in 1, 2, 3 days.
    Sends reminder emails + creates notifications.
    """
    run_async(_check_expiring_subscriptions())


async def _check_expiring_subscriptions():
    async with AsyncSessionLocal() as db:
        today = date.today()

        # Check for orgs expiring in 1, 2, 3 days
        for days_left in [3, 2, 1]:
            expiry_date = today + timedelta(days=days_left)

            result = await db.execute(
                select(Organization).where(
                    Organization.sub_end == expiry_date,
                    Organization.status == "active"
                )
            )
            orgs = result.scalars().all()

            for org in orgs:
                print(f"Reminder: {org.name} expires in {days_left} days")
                # TODO: Send email when SendGrid is connected
                # await send_expiry_reminder(org, days_left)


@celery_app.task(name="app.tasks.subscription.suspend_expired_orgs")
def suspend_expired_orgs():
    """
    Runs daily at midnight.
    Suspends orgs that are past grace period.
    Grace period = sub_end + 3 days.
    """
    run_async(_suspend_expired_orgs())


async def _suspend_expired_orgs():
    async with AsyncSessionLocal() as db:
        today = date.today()

        # Find orgs past grace period
        result = await db.execute(
            select(Organization).where(
                Organization.grace_until < today,
                Organization.status.in_(["active", "grace"])
            )
        )
        orgs = result.scalars().all()

        for org in orgs:
            org.status = "suspended"
            print(f"Suspended: {org.name} — grace period ended")

        await db.commit()
        print(f"Suspended {len(orgs)} organizations")