from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "pixel_crm",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.subscription",
        "app.tasks.email",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)

# Scheduled tasks — run automatically
celery_app.conf.beat_schedule = {
    # Check expiring subscriptions every day at 9 AM
    "check-expiring-subscriptions": {
        "task": "app.tasks.subscription.check_expiring_subscriptions",
        "schedule": crontab(hour=9, minute=0),
    },
    # Move expired orgs to grace period — daily midnight
    "update-grace-period": {
        "task": "app.tasks.subscription.update_grace_period",
        "schedule": crontab(hour=0, minute=0),
    },
    # Suspend orgs past grace period — daily midnight
    "suspend-expired-orgs": {
        "task": "app.tasks.subscription.suspend_expired_orgs",
        "schedule": crontab(hour=0, minute=1),
    },
    # Ping DB daily to prevent Supabase pause
    "ping-database": {
        "task": "app.tasks.subscription.ping_db",
        "schedule": crontab(hour=12, minute=0),
    },
}