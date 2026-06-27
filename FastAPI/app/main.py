"""
FastAPI application entry point.

AI-Based Satellite Image Temporal Resolution Enhancement
using Deep Learning Frame Interpolation (RIFE HDv3).
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, OUTPUT_DIR, HOST, PORT
from app.routes import health, predict, batch
from app.services import rife_service

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — load the RIFE model once at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the RIFE model on startup; cleanup on shutdown."""
    logger.info("Starting up — loading RIFE HDv3 model ...")
    rife_service.load_model()
    logger.info("Model loaded. Server is ready.")
    yield
    logger.info("Shutting down.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Satellite Frame Interpolation API",
    description=(
        "AI-powered satellite image temporal resolution enhancement "
        "using RIFE HDv3 deep learning frame interpolation. "
        "Supports GOES-19, INSAT-3DS/3DR, and Himawari-8 data in "
        "NetCDF (.nc) and standard image formats. "
        "Upload consecutive satellite frames and receive "
        "AI-generated intermediate frames with quality metrics "
        "(SSIM, MSE, PSNR, FSIM)."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static file serving — generated output images & animations
# ---------------------------------------------------------------------------
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(batch.router)


# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info",
    )
