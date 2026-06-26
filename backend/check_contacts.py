import asyncio
from app.database import AsyncSessionLocal
from app.models.contact import Contact
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Contact))
        contacts = result.scalars().all()
        print(f"Total contacts: {len(contacts)}")
        for c in contacts[:10]:
            print(f"ID: {c.id}, Name: {c.first_name} {c.last_name}, Stage: {c.lifecycle_stage}, Score: {c.lead_score}, Tags: {c.tags}")

if __name__ == '__main__':
    asyncio.run(main())
