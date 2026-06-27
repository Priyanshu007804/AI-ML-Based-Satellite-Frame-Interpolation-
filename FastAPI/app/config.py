"""
Centralized configuration for the FastAPI RIFE application.
All paths are resolved relative to the project root.
"""

import os
from pathlib import Path

# Project root is the parent of the 'app/' package
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Directory containing RIFE HDv3 model weights (flownet.pkl)
MODEL_DIR = PROJECT_ROOT / "train_log"

# Directory for temporarily stored uploaded images
UPLOAD_DIR = PROJECT_ROOT / "app" / "uploads"

# Directory for generated output images
OUTPUT_DIR = PROJECT_ROOT / "app" / "outputs"

# Directory for satellite data (GOES-19, INSAT-3DS, Himawari)
SATELLITE_DATA_DIR = PROJECT_ROOT / "app" / "satellite_data"

# Directory for batch processing jobs
BATCH_DIR = PROJECT_ROOT / "app" / "batch_jobs"

# Directory for generated animations
ANIMATION_DIR = OUTPUT_DIR / "animations"

# Allowed file extensions for upload validation
ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp",
    ".nc", ".nc4", ".h5", ".hdf5",  # NetCDF / HDF5 satellite data
}

# Allowed image-only extensions (for backward compatibility)
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}

# Allowed satellite data extensions
ALLOWED_NC_EXTENSIONS = {".nc", ".nc4", ".h5", ".hdf5"}

# Server configuration
HOST = os.getenv("FASTAPI_HOST", "0.0.0.0")
PORT = int(os.getenv("FASTAPI_PORT", "8000"))

# CORS origins — Next.js dev server + allow overrides via env
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

# Default interpolation exponent (2^exp - 1 intermediate frames generated)
DEFAULT_EXP = int(os.getenv("RIFE_EXP", "3"))

# GOES-19 ABI public S3 bucket (no auth needed — free tier)
GOES19_BUCKET = "noaa-goes19"
GOES19_PRODUCT = "ABI-L2-CMIPF"  # Cloud & Moisture Imagery Full Disk
GOES19_CHANNEL = 13  # TIR ~10.3 µm

# Ensure required directories exist
for d in [UPLOAD_DIR, OUTPUT_DIR, SATELLITE_DATA_DIR, BATCH_DIR, ANIMATION_DIR]:
    d.mkdir(parents=True, exist_ok=True)
