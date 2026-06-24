from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID

class UserInvite(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str = "executive"
    job_title: Optional[str] = None
    department: Optional[str] = None
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None

class RoleUpdate(BaseModel):
    role: str

class TransferData(BaseModel):
    to_user_id: UUID

class UserResponse(BaseModel):
    id: UUID
    org_id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    job_title: Optional[str]
    department: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    tour_completed: bool
    last_login_at: Optional[str]
    created_at: Optional[str]

    model_config = ConfigDict(from_attributes=True)