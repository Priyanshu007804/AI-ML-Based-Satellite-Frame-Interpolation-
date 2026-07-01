"""
Health check endpoint.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/", summary="Root / Uptime Check")
async def root_check():
    """Return the server running status for Uptime Robot."""
    return {"status": "ok"}

@router.get("/health", summary="Health check")
async def health_check():
    """Return backend health and service metadata."""
    return {
        "status": "running",
        "service": "Satellite Frame Interpolation API",
        "model": "RIFE HDv3",
        "version": "1.0.0",
    }
