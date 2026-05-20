import uuid
from sqlalchemy import Text, ForeignKey, Date, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Billing(Base):
    __tablename__ = "billing"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    razorpay_order_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False)
    period_start: Mapped[str | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[str | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="pending")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization = relationship("Organization", back_populates="billing")