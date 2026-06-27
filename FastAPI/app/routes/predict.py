"""
Prediction endpoint — accepts two satellite frames (images or NetCDF)
and returns the AI-interpolated intermediate frame with quality metrics.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Query

from app.config import (
    UPLOAD_DIR, OUTPUT_DIR, DEFAULT_EXP,
    ALLOWED_EXTENSIONS, ALLOWED_NC_EXTENSIONS,
)
from app.utils.file_helpers import (
    generate_unique_filename,
    validate_extension,
    save_upload,
    cleanup_files,
)
from app.services import rife_service, metrics_service, visualization_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prediction"])


@router.post("/predict", summary="Generate interpolated satellite frame")
async def predict(
    frame1: UploadFile = File(..., description="First satellite image or .nc file"),
    frame2: UploadFile = File(..., description="Second satellite image or .nc file"),
    ground_truth: UploadFile = File(
        None, description="Optional: real intermediate frame for validation"
    ),
    exp: int = Query(
        default=DEFAULT_EXP,
        ge=1,
        le=6,
        description="Interpolation exponent (2^exp+1 total frames, middle is returned). Default: 3",
    ),
):
    """Accept two satellite frames and generate an intermediate frame using RIFE HDv3.

    Supports both standard images (PNG, JPG, TIFF) and NetCDF (.nc, .h5) satellite data.
    Returns quality metrics (SSIM, MSE, PSNR, FSIM) and the URL of the generated image.
    """
    # ---- Validate uploads ----
    if not frame1.filename or not frame2.filename:
        raise HTTPException(status_code=400, detail="Both frame1 and frame2 must have filenames.")

    if not validate_extension(frame1.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for frame1: '{frame1.filename}'. Allowed: {ALLOWED_EXTENSIONS}",
        )
    if not validate_extension(frame2.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for frame2: '{frame2.filename}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Detect if NetCDF input
    ext1 = Path(frame1.filename).suffix.lower()
    ext2 = Path(frame2.filename).suffix.lower()
    is_nc = ext1 in ALLOWED_NC_EXTENSIONS or ext2 in ALLOWED_NC_EXTENSIONS

    # ---- Generate unique filenames ----
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

    gt_path = None
    cleanup_list = [f1_path, f2_path]

    try:
        # ---- Save uploaded files ----
        logger.info("Saving uploaded frames ...")
        await save_upload(frame1, f1_path)
        await save_upload(frame2, f2_path)

        # Save ground truth if provided
        if ground_truth and ground_truth.filename:
            gt_name = generate_unique_filename("ground_truth", Path(ground_truth.filename).suffix.lower())
            gt_path = UPLOAD_DIR / gt_name
            await save_upload(ground_truth, gt_path)
            cleanup_list.append(gt_path)

        # ---- Handle NetCDF conversion ----
        f1_img_path = f1_path
        f2_img_path = f2_path
        nc_output_path = None
        nc_metadata = None

        if is_nc:
            from app.services import nc_service

            logger.info("Converting NetCDF files to images for inference ...")

            # Convert NC to PNG for RIFE processing
            f1_png = UPLOAD_DIR / f1_name.replace(ext1, ".png")
            f2_png = UPLOAD_DIR / f2_name.replace(ext2, ".png")

            if ext1 in ALLOWED_NC_EXTENSIONS:
                data1, meta1 = nc_service.read_nc_as_array(f1_path)
                import cv2
                cv2.imwrite(str(f1_png), nc_service.array_to_bgr(data1))
                f1_img_path = f1_png
                cleanup_list.append(f1_png)
                nc_metadata = meta1
            if ext2 in ALLOWED_NC_EXTENSIONS:
                data2, meta2 = nc_service.read_nc_as_array(f2_path)
                import cv2
                cv2.imwrite(str(f2_png), nc_service.array_to_bgr(data2))
                f2_img_path = f2_png
                cleanup_list.append(f2_png)
                if nc_metadata is None:
                    nc_metadata = meta2

        # ---- Run RIFE inference ----
        logger.info("Running RIFE interpolation (exp=%d) ...", exp)
        rife_service.interpolate(f1_img_path, f2_img_path, out_path, exp=exp)

        # ---- Save interpolated result as NC if input was NC ----
        if is_nc and nc_metadata:
            from app.services import nc_service
            nc_out_name = generate_unique_filename("interpolated", ".nc")
            nc_output_path = OUTPUT_DIR / nc_out_name
            import cv2
            result_img = cv2.imread(str(out_path), cv2.IMREAD_GRAYSCALE)
            result_normalized = result_img.astype(float) / 255.0
            nc_service.save_array_as_nc(result_normalized, nc_output_path, nc_metadata)

        # ---- Compute quality metrics ----
        gt_img_path = None
        if gt_path and gt_path.exists():
            # If GT is NC, convert it
            if gt_path.suffix.lower() in ALLOWED_NC_EXTENSIONS:
                from app.services import nc_service
                import cv2
                gt_data, _ = nc_service.read_nc_as_array(gt_path)
                gt_png = UPLOAD_DIR / generate_unique_filename("gt", ".png")
                cv2.imwrite(str(gt_png), nc_service.array_to_bgr(gt_data))
                gt_img_path = gt_png
                cleanup_list.append(gt_png)
            else:
                gt_img_path = gt_path

        metrics = metrics_service.compute_all_metrics(
            f1_img_path, f2_img_path, out_path,
            ground_truth_path=gt_img_path,
        )

        # ---- Generate visualizations ----
        logger.info("Generating visualizations...")
        visualization_service.generate_cloud_motion_heatmap(f1_img_path, f2_img_path, heatmap_path)
        visualization_service.generate_optical_flow(f1_img_path, f2_img_path, optical_flow_path)

        # ---- Build response ----
        image_url = f"/outputs/{out_name}"
        heatmap_url = f"/outputs/{heatmap_name}"
        optical_flow_url = f"/outputs/{optical_flow_name}"

        response = {
            "success": True,
            "ssim": metrics["ssim"],
            "mse": metrics["mse"],
            "psnr": metrics["psnr"],
            "fsim": metrics["fsim"],
            "reference_type": metrics["reference_type"],
            "generated_image": image_url,
            "heatmap": heatmap_url,
            "optical_flow": optical_flow_url,
        }

        if nc_output_path:
            response["generated_nc"] = f"/outputs/{nc_output_path.name}"
            response["input_type"] = "netcdf"
            response["satellite_type"] = nc_metadata.get("satellite_type", "unknown")

        return response

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
        cleanup_files(*cleanup_list)
