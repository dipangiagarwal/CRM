import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

ssl_context = ssl.create_default_context()

# Production ke liye
if settings.ENVIRONMENT == "production":
    ssl_context.check_hostname = True
    ssl_context.verify_mode = ssl.CERT_REQUIRED
else:
    # Development ke liye
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    settings.DATABASE_URL,
    # connect_args={"ssl": ssl_context},   # in production
    connect_args={
        "ssl": False  # Disable SSL completely for now
    },
    echo=settings.ENVIRONMENT == "development",
    pool_size=15,
    max_overflow=10,
    pool_recycle=300,      # recycle connections every 5 minutes
    pool_pre_ping=True,    # test connection before using it — auto-reconnects if closed
    pool_timeout=30,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise