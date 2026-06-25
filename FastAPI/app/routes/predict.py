"""
Prediction endpoint — accepts two satellite frames and returns
the AI-interpolated intermediate frame with quality metrics.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Query

from app.config import UPLOAD_DIR, OUTPUT_DIR, DEFAULT_EXP
from app.utils.file_helpers import (
    generate_unique_filename,
    validate_image_extension,
    save_upload,
    cleanup_files,
)
from app.services import rife_service, metrics_service, visualization_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prediction"])


@router.post("/predict", summary="Generate interpolated satellite frame")
async def predict(
    frame1: UploadFile = File(..., description="First satellite image"),
    frame2: UploadFile = File(..., description="Second satellite image"),
    exp: int = Query(
        default=DEFAULT_EXP,
        ge=1,
        le=6,
        description="Interpolation exponent (2^exp+1 total frames, middle is returned). Default: 3",
    ),
):
    """Accept two satellite images and generate an intermediate frame using RIFE HDv3.

    Returns quality metrics (SSIM, MSE, PSNR) and the URL of the generated image.
    """
    # ---- Validate uploads ----
    if not frame1.filename or not frame2.filename:
        raise HTTPException(status_code=400, detail="Both frame1 and frame2 must have filenames.")

    if not validate_image_extension(frame1.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for frame1: '{frame1.filename}'. Allowed: PNG, JPG, TIFF, BMP.",
        )
    if not validate_image_extension(frame2.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for frame2: '{frame2.filename}'. Allowed: PNG, JPG, TIFF, BMP.",
        )

    # ---- Generate unique filenames ----
    ext1 = Path(frame1.filename).suffix.lower()
    ext2 = Path(frame2.filename).suffix.lower()
    f1_name = generate_unique_filename("frame1", ext1)
    f2_name = generate_unique_filename("frame2", ext2)
    out_name = generate_unique_filename("interpolated", ".png")
    heatmap_name = generate_unique_filename("heatmap", ".png")
    optical_flow_name = generate_unique_filename("optical_flow", ".png")

    f1_path = UPLOAD_DIR / f1_name
    f2_path = UPLOAD_DIR / f2_name
    out_path = OUTPUT_DIR / out_name
    heatmap_path = OUTPUT_DIR / heatmap_name
    optical_flow_path = OUTPUT_DIR / optical_flow_name

    try:
        # ---- Save uploaded files ----
        logger.info("Saving uploaded frames ...")
        await save_upload(frame1, f1_path)
        await save_upload(frame2, f2_path)

        # ---- Run RIFE inference ----
        logger.info("Running RIFE interpolation (exp=%d) ...", exp)
        rife_service.interpolate(f1_path, f2_path, out_path, exp=exp)

        # ---- Compute quality metrics ----
        metrics = metrics_service.compute_all_metrics(f1_path, f2_path, out_path)

        # ---- Generate visualizations ----
        logger.info("Generating visualizations...")
        visualization_service.generate_cloud_motion_heatmap(f1_path, f2_path, heatmap_path)
        visualization_service.generate_optical_flow(f1_path, f2_path, optical_flow_path)

        # ---- Build response ----
        # URL paths relative to the static mount (served at /outputs/)
        image_url = f"/outputs/{out_name}"
        heatmap_url = f"/outputs/{heatmap_name}"
        optical_flow_url = f"/outputs/{optical_flow_name}"

        return {
            "success": True,
            "ssim": metrics["ssim"],
            "mse": metrics["mse"],
            "psnr": metrics["psnr"],
            "generated_image": image_url,
            "heatmap": heatmap_url,
            "optical_flow": optical_flow_url,
        }

    except FileNotFoundError as e:
        logger.error("File not found: %s", e)
        raise HTTPException(status_code=404, detail=str(e))

    except RuntimeError as e:
        logger.error("Inference error: %s", e)
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    except Exception as e:
        logger.exception("Unexpected error during prediction")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Clean up uploaded files (outputs are kept for serving)
        cleanup_files(f1_path, f2_path)
