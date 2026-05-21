from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class ActivityCreate(BaseModel):
    contact_id: UUID
    deal_id: Optional[UUID] = None
    type: str  # call | email | note | meeting | task
    title: str
    body: Optional[str] = None

class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None

class ActivityResponse(BaseModel):
    id: UUID
    org_id: UUID
    contact_id: UUID
    deal_id: Optional[UUID]
    user_id: UUID
    type: str
    title: str
    body: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True