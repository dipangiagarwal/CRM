import uuid
from datetime import date
from sqlalchemy import Text, Integer, Date, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="active")
    plan: Mapped[str] = mapped_column(Text, default="starter")
    sub_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    grace_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    max_users: Mapped[int] = mapped_column(Integer, default=5)
    modules: Mapped[dict] = mapped_column(JSON, default=lambda: {
        "pipeline": True,
        "reports": True,
        "activities": True,
        "files": True,
        "whatsapp": False,
        "email": False,
    })
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        Text, default=lambda: str(uuid.uuid4())
    )
    users = relationship("User", back_populates="organization")
    contacts = relationship("Contact", back_populates="organization")
    deals = relationship("Deal", back_populates="organization")
    activities = relationship("Activity", back_populates="organization")
    billing = relationship("Billing", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    files = relationship("File", back_populates="organization")