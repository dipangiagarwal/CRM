from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class CreateOrderRequest(BaseModel):
    plan: str  # starter | growth | enterprise

class BillingResponse(BaseModel):
    id: UUID
    org_id: UUID
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    amount: float
    plan: str
    status: str
    created_at: Optional[str]

    class Config:
        from_attributes = True