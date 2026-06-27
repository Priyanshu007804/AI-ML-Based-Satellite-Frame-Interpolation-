"""
File handling utilities for upload processing and cleanup.
"""

import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile

from app.config import ALLOWED_EXTENSIONS


def generate_unique_filename(prefix: str = "frame", ext: str = ".png") -> str:
    """Generate a UUID-based filename to prevent collisions.

    Args:
        prefix: Filename prefix (e.g., 'frame1', 'output').
        ext: File extension including dot.

    Returns:
        Unique filename string.
    """
    return f"{prefix}_{uuid.uuid4().hex[:12]}{ext}"


def validate_extension(filename: str) -> bool:
    """Check if the uploaded file has an allowed extension.

    Supports both image files and NetCDF/HDF5 satellite data.

    Args:
        filename: Original filename from the upload.

    Returns:
        True if the extension is allowed.
    """
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


# Keep backward compatibility
validate_image_extension = validate_extension


async def save_upload(upload_file: UploadFile, destination: Path) -> Path:
    """Save an uploaded file to disk asynchronously.

    Args:
        upload_file: FastAPI UploadFile object.
        destination: Full path where the file should be saved.

    Returns:
        The destination Path.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(destination, "wb") as f:
        content = await upload_file.read()
        await f.write(content)
    return destination


def cleanup_files(*paths: Path) -> None:
    """Remove temporary files silently (ignores missing files).

    Args:
        paths: File paths to delete.
    """
    for p in paths:
        try:
            if p and p.exists():
                p.unlink()
        except OSError:
            pass
