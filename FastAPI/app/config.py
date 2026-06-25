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

# Allowed image extensions for upload validation
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}

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

# Ensure required directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
