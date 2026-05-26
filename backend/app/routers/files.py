import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import verify_token, CurrentUser
from app.models.file import File as FileModel
from app.schemas.file import FileResponse
from app.services.storage import upload_file, get_file, delete_file
import io

router = APIRouter(prefix="/files", tags=["Files"])

# Allowed file types for security
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/webp"
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload_file", response_model=FileResponse)
async def upload(
    file: UploadFile = File(...),
    contact_id: Optional[str] = Query(None),
    deal_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload file to Cloudflare R2.
    Validates file type and size before upload.
    Saves metadata to PostgreSQL after upload.
    Links file to contact or deal if provided.
    """

    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: PDF, Word, Excel, CSV, Images"
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB"
        )

    # Upload to R2
    upload_result = await upload_file(
        file_bytes=file_bytes,
        filename=file.filename,
        org_id=user.org_id,
        mime_type=file.content_type
    )

    # Save metadata to DB
    file_record = FileModel(
        id=uuid.uuid4(),
        org_id=uuid.UUID(user.org_id),
        contact_id=uuid.UUID(contact_id) if contact_id else None,
        deal_id=uuid.UUID(deal_id) if deal_id else None,
        filename=file.filename,
        storage_path=upload_result["storage_path"],
        mime_type=upload_result["mime_type"],
        size_bytes=upload_result["size_bytes"],
        uploaded_by=uuid.UUID(user.user_id),
        created_at=str(datetime.now(timezone.utc))
    )
    db.add(file_record)
    await db.commit()
    await db.refresh(file_record)
    return file_record


@router.get("/get_files", response_model=list[FileResponse])
async def list_files(
    contact_id: Optional[str] = Query(None),
    deal_id: Optional[str] = Query(None),
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    List files for this org.
    Filter by contact or deal to show attachments.
    """
    query = select(FileModel).where(
        FileModel.org_id == uuid.UUID(user.org_id)
    )

    if contact_id:
        query = query.where(FileModel.contact_id == uuid.UUID(contact_id))
    if deal_id:
        query = query.where(FileModel.deal_id == uuid.UUID(deal_id))

    query = query.order_by(FileModel.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/get_file/{file_id}/download")
async def download_file(
    file_id: str,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Download file — auth checked before serving.
    Never expose direct R2 URLs.
    org_id check ensures cross-tenant file access is blocked.
    """
    result = await db.execute(
        select(FileModel).where(
            FileModel.id == uuid.UUID(file_id),
            FileModel.org_id == uuid.UUID(user.org_id)
        )
    )
    file_record = result.scalar_one_or_none()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Get file bytes from R2
    file_bytes = await get_file(file_record.storage_path)

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=file_record.mime_type,
        headers={
            "Content-Disposition": f"attachment; filename={file_record.filename}"
        }
    )


@router.delete("/delete_file/{file_id}")
async def delete(
    file_id: str,
    user: CurrentUser = Depends(verify_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete file from R2 and remove metadata from DB.
    org_id check ensures users cannot delete other org's files.
    """
    result = await db.execute(
        select(FileModel).where(
            FileModel.id == uuid.UUID(file_id),
            FileModel.org_id == uuid.UUID(user.org_id)
        )
    )
    file_record = result.scalar_one_or_none()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete from R2 first
    await delete_file(file_record.storage_path)

    # Delete metadata from DB
    await db.delete(file_record)
    await db.commit()

    return {"message": "File deleted successfully", "id": file_id}