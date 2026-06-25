"""
Health check endpoint.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health_check():
    """Return the server running status."""
    return {"status": "running"}
