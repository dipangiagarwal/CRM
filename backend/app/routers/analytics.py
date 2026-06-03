import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.middleware.auth import verify_token, CurrentUser
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.activity import Activity
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Dashboard overview stats.
    Total contacts, deals, revenue, win rate.
    """
    org_id = uuid.UUID(user.org_id)

    # Total contacts
    contacts_result = await db.execute(
        select(func.count()).where(Contact.org_id == org_id)
    )
    total_contacts = contacts_result.scalar()

    # Total deals
    deals_result = await db.execute(
        select(func.count()).where(Deal.org_id == org_id)
    )
    total_deals = deals_result.scalar()

    # Won deals — revenue
    won_result = await db.execute(
        select(func.count(), func.coalesce(func.sum(Deal.value), 0)).where(
            Deal.org_id == org_id,
            Deal.stage == "won"
        )
    )
    won_row = won_result.first()
    won_deals = won_row[0]
    total_revenue = float(won_row[1])

    # Lost deals
    lost_result = await db.execute(
        select(func.count()).where(
            Deal.org_id == org_id,
            Deal.stage == "lost"
        )
    )
    lost_deals = lost_result.scalar()

    # Win rate
    closed_deals = won_deals + lost_deals
    win_rate = round((won_deals / closed_deals * 100), 1) if closed_deals > 0 else 0

    # Active users
    users_result = await db.execute(
        select(func.count()).where(
            User.org_id == org_id,
            User.is_active == True
        )
    )
    active_users = users_result.scalar()

    # New contacts this month
    first_of_month = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0
    )
    new_contacts_result = await db.execute(
        select(func.count()).where(
            Contact.org_id == org_id,
            Contact.created_at >= str(first_of_month)
        )
    )
    new_contacts_month = new_contacts_result.scalar()

    return {
        "total_contacts": total_contacts,
        "total_deals": total_deals,
        "total_revenue": total_revenue,
        "won_deals": won_deals,
        "lost_deals": lost_deals,
        "win_rate": win_rate,
        "active_users": active_users,
        "new_contacts_this_month": new_contacts_month
    }


@router.get("/pipeline")
async def get_pipeline(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Deals by stage — for pipeline chart.
    Returns count and total value per stage.
    """
    org_id = uuid.UUID(user.org_id)

    result = await db.execute(
        select(
            Deal.stage,
            func.count().label("count"),
            func.coalesce(func.sum(Deal.value), 0).label("value")
        ).where(
            Deal.org_id == org_id
        ).group_by(Deal.stage)
    )

    stages = result.all()

    # All stages in order
    stage_order = ["new", "qualified", "proposal", "negotiation", "won", "lost"]

    pipeline = []
    stage_map = {row.stage: row for row in stages}

    for stage in stage_order:
        row = stage_map.get(stage)
        pipeline.append({
            "stage": stage,
            "count": row.count if row else 0,
            "value": float(row.value) if row else 0.0
        })

    return {"pipeline": pipeline}


@router.get("/activities")
async def get_activities_summary(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Activities by type — for activity chart.
    This week vs last week comparison.
    """
    org_id = uuid.UUID(user.org_id)

    # This week start
    today = datetime.now(timezone.utc)
    this_week_start = today - timedelta(days=today.weekday())
    this_week_start = this_week_start.replace(hour=0, minute=0, second=0)
    last_week_start = this_week_start - timedelta(days=7)

    # This week activities by type
    this_week_result = await db.execute(
        select(
            Activity.type,
            func.count().label("count")
        ).where(
            Activity.org_id == org_id,
            Activity.created_at >= str(this_week_start)
        ).group_by(Activity.type)
    )

    # Last week activities by type
    last_week_result = await db.execute(
        select(
            Activity.type,
            func.count().label("count")
        ).where(
            Activity.org_id == org_id,
            Activity.created_at >= str(last_week_start),
            Activity.created_at < str(this_week_start)
        ).group_by(Activity.type)
    )

    this_week = {row.type: row.count for row in this_week_result.all()}
    last_week = {row.type: row.count for row in last_week_result.all()}

    types = ["call", "email", "note", "meeting", "task", "message"]

    summary = []
    for t in types:
        summary.append({
            "type": t,
            "this_week": this_week.get(t, 0),
            "last_week": last_week.get(t, 0)
        })

    return {"activities": summary}


@router.get("/revenue")
async def get_revenue_trend(
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Monthly revenue trend — last 6 months.
    For line/bar chart on dashboard.
    """
    org_id = uuid.UUID(user.org_id)

    today = datetime.now(timezone.utc)
    months = []

    for i in range(5, -1, -1):
        # Go back i months
        month_date = today.replace(day=1) - timedelta(days=i * 30)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0)

        # Next month start
        if month_date.month == 12:
            next_month = month_date.replace(year=month_date.year + 1, month=1, day=1)
        else:
            next_month = month_date.replace(month=month_date.month + 1, day=1)

        result = await db.execute(
            select(
                func.coalesce(func.sum(Deal.value), 0).label("revenue")
            ).where(
                Deal.org_id == org_id,
                Deal.stage == "won",
                Deal.created_at >= str(month_start),
                Deal.created_at < str(next_month)
            )
        )

        revenue = result.scalar()

        months.append({
            "month": month_date.strftime("%b %Y"),
            "revenue": float(revenue) if revenue else 0.0
        })

    return {"revenue_trend": months}