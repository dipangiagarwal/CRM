from datetime import date, timedelta
from sqlalchemy import select
from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.organization import Organization
import asyncio


def run_async(coro):
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    try:
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
        except:
            pass


@celery_app.task(name="app.tasks.subscription.check_expiring_subscriptions")
def check_expiring_subscriptions():
    """Runs daily at 9 AM. Sends reminders for expiring subscriptions."""
    run_async(_check_expiring_subscriptions())


async def _check_expiring_subscriptions():
    async with AsyncSessionLocal() as db:
        today = date.today()

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
                # TODO: Send expiry reminder email
                # from app.tasks.email import send_expiry_reminder
                # send_expiry_reminder.delay(...)


@celery_app.task(name="app.tasks.subscription.update_grace_period")
def update_grace_period():
    """
    Runs daily at midnight.
    Moves expired orgs to grace period status.
    Grace period = sub_end + 3 days.
    """
    run_async(_update_grace_period())


# update_grace_period function
async def _update_grace_period():
    async with AsyncSessionLocal() as db:
        today = date.today()

        result = await db.execute(
            select(Organization).where(
                Organization.sub_end < today,
                Organization.status == "active"
            )
        )
        orgs = result.scalars().all()

        for org in orgs:
            org.status = "grace"
            org.grace_until = org.sub_end + timedelta(days=3)
            print(f"Grace period started: {org.name} — until {org.grace_until}")

            # Get admin email
            from app.models.user import User
            admin_result = await db.execute(
                select(User).where(
                    User.org_id == org.id,
                    User.role == "admin",
                    User.is_active == True
                )
            )
            admin = admin_result.scalars().first()

            if admin:
                from app.tasks.email import send_grace_period_email
                send_grace_period_email.delay(
                    email=admin.email,
                    first_name=admin.first_name,
                    company_name=org.name,
                    grace_until=str(org.grace_until),
                    sub_end=str(org.sub_end)
                )

        await db.commit()
        print(f"Moved {len(orgs)} orgs to grace period")


@celery_app.task(name="app.tasks.subscription.suspend_expired_orgs")
def suspend_expired_orgs():
    """
    Runs daily at midnight.
    Suspends orgs that are past grace period.
    """
    run_async(_suspend_expired_orgs())


async def _suspend_expired_orgs():
    async with AsyncSessionLocal() as db:
        today = date.today()

        result = await db.execute(
            select(Organization).where(
                Organization.grace_until < today,
                Organization.status == "grace"
            )
        )
        orgs = result.scalars().all()

        for org in orgs:
            org.status = "suspended"
            print(f"Suspended: {org.name} — grace period ended")

        await db.commit()
        print(f"Suspended {len(orgs)} organizations")


@celery_app.task(name="app.tasks.subscription.ping_db")
def ping_db():
    """Ping DB daily to prevent Supabase from pausing."""
    run_async(_ping_db())


async def _ping_db():
    async with AsyncSessionLocal() as db:
        await db.execute(select(Organization).limit(1))
        print("DB pinged — keeping Supabase active")