import boto3
import uuid
import os
from botocore.config import Config
from app.config import settings

def is_r2_configured() -> bool:
    """Check if Cloudflare R2 credentials are valid and not placeholders."""
    dummy_values = {"your_account_id", "your_access_key", "your_secret_key", ""}
    return (
        settings.R2_ACCOUNT_ID not in dummy_values and
        settings.R2_ACCESS_KEY_ID not in dummy_values and
        settings.R2_SECRET_ACCESS_KEY not in dummy_values
    )

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

# Local directory where files will be stored in fallback mode
LOCAL_STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))

async def upload_file(
    file_bytes: bytes,
    filename: str,
    org_id: str,
    mime_type: str
) -> dict:
    """
    Upload file to R2 (or local disk in fallback mode).
    Path structure: orgs/{org_id}/files/{unique_filename}
    This keeps files organized per organization.
    """
    ext = filename.split(".")[-1] if "." in filename else ""
    unique_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
    storage_path = f"orgs/{org_id}/files/{unique_name}"

    if is_r2_configured():
        try:
            client = get_r2_client()
            client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=storage_path,
                Body=file_bytes,
                ContentType=mime_type
            )
        except Exception as e:
            print(f"R2 upload failed, trying local disk fallback: {str(e)}")
            # If R2 upload fails, fall back to local disk
            _save_local(storage_path, file_bytes)
    else:
        # Use local disk fallback
        _save_local(storage_path, file_bytes)

    return {
        "storage_path": storage_path,
        "original_filename": filename,
        "mime_type": mime_type,
        "size_bytes": len(file_bytes)
    }

def _save_local(storage_path: str, file_bytes: bytes):
    """Helper to save file locally on disk."""
    local_path = os.path.join(LOCAL_STORAGE_DIR, storage_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    print(f"File saved to local storage fallback: {local_path}")

async def delete_file(storage_path: str):
    """Delete file from R2 or local disk."""
    if is_r2_configured():
        try:
            client = get_r2_client()
            client.delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=storage_path
            )
            return
        except Exception as e:
            print(f"R2 delete failed: {str(e)}")
            
    # Fallback to local delete
    local_path = os.path.join(LOCAL_STORAGE_DIR, storage_path.replace("/", os.sep))
    if os.path.exists(local_path):
        os.remove(local_path)
        print(f"File deleted from local storage fallback: {local_path}")

async def get_file(storage_path: str) -> bytes:
    """
    Download file from R2 or local disk.
    Never expose direct R2 URLs — always proxy through backend.
    """
    if is_r2_configured():
        try:
            client = get_r2_client()
            response = client.get_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=storage_path
            )
            return response["Body"].read()
        except Exception as e:
            print(f"R2 read failed, trying local disk fallback: {str(e)}")

    # Fallback to local read
    local_path = os.path.join(LOCAL_STORAGE_DIR, storage_path.replace("/", os.sep))
    if os.path.exists(local_path):
        with open(local_path, "rb") as f:
            return f.read()
    raise FileNotFoundError(f"File not found: {storage_path}")