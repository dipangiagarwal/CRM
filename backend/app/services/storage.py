import boto3
import uuid
from botocore.config import Config
from app.config import settings

def get_r2_client():
    """
    R2 is S3-compatible — boto3 works directly.
    Endpoint URL format is specific to Cloudflare R2.
    """
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )


async def upload_file(
    file_bytes: bytes,
    filename: str,
    org_id: str,
    mime_type: str
) -> dict:
    """
    Upload file to R2.
    Path structure: orgs/{org_id}/files/{unique_filename}
    This keeps files organized per organization.
    """
    # Generate unique filename to avoid conflicts
    ext = filename.split(".")[-1] if "." in filename else ""
    unique_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
    storage_path = f"orgs/{org_id}/files/{unique_name}"

    client = get_r2_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=storage_path,
        Body=file_bytes,
        ContentType=mime_type
    )

    return {
        "storage_path": storage_path,
        "original_filename": filename,
        "mime_type": mime_type,
        "size_bytes": len(file_bytes)
    }


async def delete_file(storage_path: str):
    """Delete file from R2 — called when file record is deleted."""
    client = get_r2_client()
    client.delete_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=storage_path
    )


async def get_file(storage_path: str) -> bytes:
    """
    Download file from R2.
    Never expose direct R2 URLs — always proxy through backend.
    This ensures auth check happens before every download.
    """
    client = get_r2_client()
    response = client.get_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=storage_path
    )
    return response["Body"].read()