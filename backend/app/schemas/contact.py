from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from uuid import UUID

class ContactCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    lifecycle_stage: Optional[str] = "lead"
    lead_score: Optional[int] = 0
    source: Optional[str] = None
    tags: Optional[List[str]] = []
    custom_fields: Optional[dict] = {}

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    lead_score: Optional[int] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None

class ContactResponse(BaseModel):
    id: UUID
    org_id: UUID
    owner_id: UUID
    first_name: str
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    company_name: Optional[str]
    lifecycle_stage: str
    lead_score: int
    source: Optional[str]
    tags: List[str]
    custom_fields: dict
    last_activity_at: Optional[str]
    created_at: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class ContactAssign(BaseModel):
    lead_assgned_to: UUID

    class Config:
        from_attributes = True