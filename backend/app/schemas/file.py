from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class FileResponse(BaseModel):
    id: UUID
    org_id: UUID
    filename: str
    storage_path: str
    mime_type: str
    size_bytes: int
    uploaded_by: UUID
    contact_id: Optional[UUID]
    deal_id: Optional[UUID]
    created_at: Optional[str]

    class Config:
        from_attributes = True