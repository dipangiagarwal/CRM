import boto3
import uuid
import os
from botocore.config import Config
from app.config import settings

def is_b2_configured() -> bool:
    """Check if Backblaze B2 credentials are valid and not placeholders."""
    dummy_values = {"your_key_id", "your_application_key", "your_bucket_id", "your_bucket_name", ""}
    return (
        settings.B2_KEY_ID not in dummy_values and
        settings.B2_APPLICATION_KEY not in dummy_values and
        settings.B2_BUCKET_NAME not in dummy_values and
        settings.B2_ENDPOINT not in dummy_values
    )

def get_b2_client():
    """
    Backblaze B2 is S3-compatible — boto3 works directly.
    Endpoint format: s3.us-west-004.backblazeb2.com (region varies)
    """
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.B2_ENDPOINT}",
        aws_access_key_id=settings.B2_KEY_ID,
        aws_secret_access_key=settings.B2_APPLICATION_KEY,
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
    Upload file to Backblaze B2 (or local disk in fallback mode).
    Path structure: orgs/{org_id}/files/{unique_filename}
    """
    ext = filename.split(".")[-1] if "." in filename else ""
    unique_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
    storage_path = f"orgs/{org_id}/files/{unique_name}"

    if is_b2_configured():
        try:
            client = get_b2_client()
            client.put_object(
                Bucket=settings.B2_BUCKET_NAME,
                Key=storage_path,
                Body=file_bytes,
                ContentType=mime_type
            )
        except Exception as e:
            print(f"B2 upload failed, falling back to local disk: {str(e)}")
            _save_local(storage_path, file_bytes)
    else:
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
    """Delete file from B2 or local disk."""
    if is_b2_configured():
        try:
            client = get_b2_client()
            client.delete_object(
                Bucket=settings.B2_BUCKET_NAME,
                Key=storage_path
            )
            return
        except Exception as e:
            print(f"B2 delete failed: {str(e)}")

    # Fallback to local delete
    local_path = os.path.join(LOCAL_STORAGE_DIR, storage_path.replace("/", os.sep))
    if os.path.exists(local_path):
        os.remove(local_path)
        print(f"File deleted from local storage: {local_path}")

async def get_file(storage_path: str) -> bytes:
    """
    Download file from B2 or local disk.
    Never expose direct B2 URLs — always proxy through backend.
    """
    if is_b2_configured():
        try:
            client = get_b2_client()
            response = client.get_object(
                Bucket=settings.B2_BUCKET_NAME,
                Key=storage_path
            )
            return response["Body"].read()
        except Exception as e:
            print(f"B2 read failed, trying local disk: {str(e)}")

    # Fallback to local read
    local_path = os.path.join(LOCAL_STORAGE_DIR, storage_path.replace("/", os.sep))
    if os.path.exists(local_path):
        with open(local_path, "rb") as f:
            return f.read()
    raise FileNotFoundError(f"File not found: {storage_path}")