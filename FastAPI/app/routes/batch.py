"""
Batch interpolation endpoints.

Upload multiple satellite frames (NC or images) and run batch
interpolation with progress tracking, animation generation, and report.
"""

import logging
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Form
from fastapi.responses import HTMLResponse, FileResponse

from app.config import UPLOAD_DIR, OUTPUT_DIR, BATCH_DIR, ANIMATION_DIR, ALLOWED_EXTENSIONS
from app.utils.file_helpers import generate_unique_filename, save_upload
from app.services import batch_service, animation_service, report_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/batch", tags=["Batch Processing"])


@router.post("/interpolate", summary="Batch interpolate multiple frames")
async def batch_interpolate(
    frames: list[UploadFile] = File(..., description="Multiple satellite frames in chronological order"),
    satellite_type: str = Query(
        default="auto",
        description="Satellite type: 'goes19', 'insat3d', 'himawari', or 'auto' for detection",
    ),
    levels: int = Query(
        default=1,
        ge=1,
        le=3,
        description="Interpolation levels: 1=2x, 2=4x, 3=8x temporal enhancement",
    ),
):
    """Upload multiple satellite frames and generate interpolated intermediate frames.

    Returns job results including metrics, animation, and report.
    Frames should be uploaded in chronological order.
    """
    if len(frames) < 2:
        raise HTTPException(status_code=400, detail="At least 2 frames required for interpolation")

    if len(frames) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 frames allowed per batch (free tier)")

    # Save uploaded files
    saved_paths = []
    try:
        for i, f in enumerate(frames):
            if not f.filename:
                raise HTTPException(status_code=400, detail=f"Frame {i+1} has no filename")

            ext = Path(f.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type for frame {i+1}: '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
                )

            fname = generate_unique_filename(f"batch_frame_{i:04d}", ext)
            fpath = UPLOAD_DIR / fname
            await save_upload(f, fpath)
            saved_paths.append(fpath)

        # Create and run batch job
        job = batch_service.create_batch_job(saved_paths, satellite_type)

        if levels == 1:
            job = batch_service.run_batch_interpolation(job)
        else:
            job = batch_service.run_multilevel_interpolation(job, levels=levels)

        if job.status == "failed":
            raise HTTPException(status_code=500, detail=f"Batch processing failed: {job.error}")

        # Generate animation frames as base64 for web playback
        original_b64 = animation_service.frames_to_base64_sequence(
            job.original_frames_png, max_size=512
        )
        all_b64 = animation_service.frames_to_base64_sequence(
            job.all_frames_png, max_size=512
        )

        # Generate comparison animation
        comparison_path = ANIMATION_DIR / f"{job.job_id}_comparison.mp4"
        try:
            animation_service.generate_comparison_animation(
                original_paths=job.original_frames_png,
                interpolated_paths=job.all_frames_png,
                output_path=comparison_path,
                fps=4,
            )
        except Exception as e:
            logger.warning("Could not generate comparison video: %s", e)
            comparison_path = None

        # Generate report
        avg_metrics = batch_service._compute_average_metrics(job.all_metrics)
        report_path = job.output_dir / "report.html"
        report_service.generate_html_report(
            job_id=job.job_id,
            input_frames=job.original_frames_png,
            interpolated_frames=job.interpolated_frames_png,
            all_frames=job.all_frames_png,
            metrics_list=job.all_metrics,
            average_metrics=avg_metrics,
            satellite_type=satellite_type,
            output_path=report_path,
        )

        return {
            "success": True,
            "job_id": job.job_id,
            "num_input_frames": len(saved_paths),
            "num_output_frames": len(job.all_frames_png),
            "temporal_enhancement": f"{2**levels}x",
            "levels": levels,
            "metrics": job.all_metrics,
            "average_metrics": avg_metrics,
            "original_frames_b64": original_b64,
            "all_frames_b64": all_b64,
            "report_url": f"/batch/{job.job_id}/report",
            "comparison_video_url": f"/outputs/animations/{job.job_id}_comparison.mp4" if comparison_path else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Batch interpolation error")
        raise HTTPException(status_code=500, detail=f"Batch processing error: {e}")
    finally:
        # Clean up uploaded files
        for p in saved_paths:
            try:
                if p.exists():
                    p.unlink()
            except OSError:
                pass


@router.get("/{job_id}/report", summary="Get interpolation report", response_class=HTMLResponse)
async def get_report(job_id: str):
    """Retrieve the HTML comparison report for a batch job."""
    report_path = BATCH_DIR / job_id / "report.html"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail=f"Report not found for job: {job_id}")

    return HTMLResponse(content=report_path.read_text(encoding="utf-8"))


@router.get("/{job_id}/status", summary="Get batch job status")
async def get_job_status(job_id: str):
    """Check the status and progress of a batch interpolation job."""
    job = batch_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job.to_dict()
