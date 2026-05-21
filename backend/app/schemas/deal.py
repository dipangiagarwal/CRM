from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date

class DealCreate(BaseModel):
    contact_id: UUID
    title: str
    value: Optional[float] = None
    stage: Optional[str] = "new"
    expected_close: Optional[date] = None
    probability: Optional[int] = 0
    lost_reason: Optional[str] = None

class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    expected_close: Optional[date] = None
    probability: Optional[int] = None
    lost_reason: Optional[str] = None

class DealStageUpdate(BaseModel):
    stage: str
    lost_reason: Optional[str] = None

class DealResponse(BaseModel):
    id: UUID
    org_id: UUID
    contact_id: UUID
    owner_id: UUID
    title: str
    value: Optional[float]
    stage: str
    expected_close: Optional[date]
    probability: int
    lost_reason: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True