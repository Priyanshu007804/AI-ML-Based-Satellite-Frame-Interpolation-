"""
Batch interpolation service.

Processes sequences of satellite frames and generates intermediate frames
using RIFE HDv3, enabling temporal resolution enhancement
(e.g., 30 min → 15 min → 7.5 min).
"""

import json
import logging
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

import cv2
import numpy as np

from app.config import BATCH_DIR, OUTPUT_DIR
from app.services import rife_service, nc_service, metrics_service

logger = logging.getLogger(__name__)


class BatchJob:
    """Represents a batch interpolation job with progress tracking."""

    def __init__(self, job_id: str, frames: list[Path], satellite_type: str = "auto"):
        self.job_id = job_id
        self.input_frames = frames
        self.satellite_type = satellite_type
        self.status = "pending"
        self.progress = 0.0
        self.total_pairs = max(len(frames) - 1, 1)
        self.current_pair = 0
        self.output_dir = BATCH_DIR / job_id
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.results: list[dict] = []
        self.all_metrics: list[dict] = []
        self.error: Optional[str] = None
        self.original_frames_png: list[str] = []
        self.interpolated_frames_png: list[str] = []
        self.all_frames_png: list[str] = []  # interleaved original + interpolated

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "progress": round(self.progress, 1),
            "total_pairs": self.total_pairs,
            "current_pair": self.current_pair,
            "num_input_frames": len(self.input_frames),
            "num_output_frames": len(self.all_frames_png),
            "error": self.error,
        }


# In-memory job store (fine for hackathon — not production)
_jobs: dict[str, BatchJob] = {}


def create_batch_job(
    frame_paths: list[Path],
    satellite_type: str = "auto",
) -> BatchJob:
    """Create a new batch interpolation job.

    Args:
        frame_paths: List of input frame paths (NC or image files), in chronological order.
        satellite_type: Satellite type for NC files ('goes19', 'insat3d', 'himawari', 'auto').

    Returns:
        BatchJob instance.
    """
    job_id = uuid.uuid4().hex[:12]
    job = BatchJob(job_id, frame_paths, satellite_type)
    _jobs[job_id] = job
    return job


def get_job(job_id: str) -> Optional[BatchJob]:
    """Retrieve a batch job by ID."""
    return _jobs.get(job_id)


def run_batch_interpolation(job: BatchJob) -> BatchJob:
    """Execute batch interpolation across all consecutive frame pairs.

    For N input frames, generates N-1 intermediate frames, resulting
    in 2N-1 total frames (doubling temporal resolution).

    Args:
        job: BatchJob instance with input frames set.

    Returns:
        Updated BatchJob with results.
    """
    job.status = "processing"
    job.total_pairs = len(job.input_frames) - 1

    try:
        # Step 1: Load and convert all frames to BGR images
        logger.info("Batch job %s: Loading %d frames...", job.job_id, len(job.input_frames))
        images = []
        metadata_list = []

        for i, fpath in enumerate(job.input_frames):
            ext = fpath.suffix.lower()
            if ext in {".nc", ".nc4", ".h5", ".hdf5"}:
                # NetCDF satellite data
                data, meta = nc_service.read_nc_as_array(fpath, job.satellite_type if job.satellite_type != "auto" else None)
                bgr = nc_service.array_to_bgr(data)
                images.append(bgr)
                metadata_list.append(meta)
            else:
                # Standard image
                bgr = cv2.imread(str(fpath), cv2.IMREAD_UNCHANGED)
                if bgr is None:
                    raise RuntimeError(f"Could not read frame {i}: {fpath}")
                if len(bgr.shape) == 2:
                    bgr = cv2.cvtColor(bgr, cv2.COLOR_GRAY2BGR)
                if bgr.shape[2] == 4:
                    bgr = cv2.cvtColor(bgr, cv2.COLOR_BGRA2BGR)
                images.append(bgr)
                metadata_list.append({"source_file": fpath.name})

        # Step 2: Save original frames as PNGs for visualization
        for i, img in enumerate(images):
            orig_path = job.output_dir / f"original_{i:04d}.png"
            cv2.imwrite(str(orig_path), img)
            job.original_frames_png.append(str(orig_path))

        # Step 3: Interpolate between each consecutive pair
        logger.info("Batch job %s: Interpolating %d pairs...", job.job_id, job.total_pairs)

        for pair_idx in range(job.total_pairs):
            job.current_pair = pair_idx + 1
            job.progress = (pair_idx / job.total_pairs) * 100

            img0 = images[pair_idx]
            img1 = images[pair_idx + 1]

            logger.info("Pair %d/%d: Interpolating...", pair_idx + 1, job.total_pairs)

            # Run RIFE interpolation (exp=1 → single middle frame)
            mid_frame = rife_service.interpolate_arrays(img0, img1, exp=1)

            # Save interpolated frame
            interp_path = job.output_dir / f"interpolated_{pair_idx:04d}.png"
            cv2.imwrite(str(interp_path), mid_frame)
            job.interpolated_frames_png.append(str(interp_path))

            # Compute metrics if we have metadata
            pair_metrics = metrics_service.compute_metrics_from_arrays(
                generated=mid_frame.astype(np.float64) / 255.0,
                reference=((img0.astype(np.float64) + img1.astype(np.float64)) / 2.0) / 255.0,
            )
            pair_metrics["pair_index"] = pair_idx
            pair_metrics["frame_before"] = job.input_frames[pair_idx].name
            pair_metrics["frame_after"] = job.input_frames[pair_idx + 1].name
            job.all_metrics.append(pair_metrics)

            # Also save as NC if input was NC
            if metadata_list[pair_idx].get("satellite_type"):
                nc_out_path = job.output_dir / f"interpolated_{pair_idx:04d}.nc"
                gray = cv2.cvtColor(mid_frame, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
                nc_service.save_array_as_nc(gray, nc_out_path, metadata_list[pair_idx])

        # Step 4: Build interleaved sequence (original + interpolated)
        for i in range(len(images)):
            job.all_frames_png.append(job.original_frames_png[i])
            if i < len(job.interpolated_frames_png):
                job.all_frames_png.append(job.interpolated_frames_png[i])

        # Step 5: Save job summary
        job.progress = 100.0
        job.status = "completed"

        summary = {
            "job_id": job.job_id,
            "status": "completed",
            "num_input_frames": len(job.input_frames),
            "num_interpolated_frames": len(job.interpolated_frames_png),
            "num_total_frames": len(job.all_frames_png),
            "temporal_enhancement": "2x",
            "metrics": job.all_metrics,
            "average_metrics": _compute_average_metrics(job.all_metrics),
        }

        summary_path = job.output_dir / "summary.json"
        with open(summary_path, "w") as f:
            json.dump(summary, f, indent=2)

        logger.info("Batch job %s completed: %d → %d frames",
                     job.job_id, len(job.input_frames), len(job.all_frames_png))

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        logger.exception("Batch job %s failed: %s", job.job_id, e)

    return job


def run_multilevel_interpolation(
    job: BatchJob,
    levels: int = 2,
) -> BatchJob:
    """Run multi-level chained interpolation for progressive temporal enhancement.

    Level 1: 30min → 15min (2× enhancement)
    Level 2: 15min → 7.5min (4× enhancement from original)

    Args:
        job: BatchJob with input frames.
        levels: Number of interpolation levels (default 2 for 4× enhancement).

    Returns:
        Updated BatchJob.
    """
    job.status = "processing"

    try:
        # Load initial frames
        current_images = []
        metadata_list = []

        for fpath in job.input_frames:
            ext = fpath.suffix.lower()
            if ext in {".nc", ".nc4", ".h5", ".hdf5"}:
                data, meta = nc_service.read_nc_as_array(fpath)
                bgr = nc_service.array_to_bgr(data)
                current_images.append(bgr)
                metadata_list.append(meta)
            else:
                bgr = cv2.imread(str(fpath), cv2.IMREAD_UNCHANGED)
                if bgr is None:
                    raise RuntimeError(f"Could not read: {fpath}")
                if len(bgr.shape) == 2:
                    bgr = cv2.cvtColor(bgr, cv2.COLOR_GRAY2BGR)
                current_images.append(bgr)
                metadata_list.append({"source_file": fpath.name})

        total_work = sum(max(len(current_images) - 1, 0) * (2 ** i) for i in range(levels))
        done_work = 0

        for level in range(levels):
            logger.info("Level %d/%d: Interpolating %d pairs...", level + 1, levels, len(current_images) - 1)

            new_images = [current_images[0]]
            for i in range(len(current_images) - 1):
                mid = rife_service.interpolate_arrays(current_images[i], current_images[i + 1], exp=1)
                new_images.append(mid)
                new_images.append(current_images[i + 1])

                done_work += 1
                job.progress = (done_work / total_work) * 100 if total_work > 0 else 100

            current_images = new_images

        # Save all frames
        for i, img in enumerate(current_images):
            frame_path = job.output_dir / f"frame_{i:04d}.png"
            cv2.imwrite(str(frame_path), img)
            job.all_frames_png.append(str(frame_path))

        job.status = "completed"
        job.progress = 100.0

        logger.info("Multi-level interpolation complete: %d → %d frames (%d levels)",
                     len(job.input_frames), len(current_images), levels)

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        logger.exception("Multi-level batch job failed: %s", e)

    return job


def _compute_average_metrics(metrics_list: list[dict]) -> dict:
    """Compute average metrics across all interpolated pairs."""
    if not metrics_list:
        return {}

    keys = ["ssim", "mse", "psnr", "fsim"]
    avg = {}
    for k in keys:
        vals = [m[k] for m in metrics_list if k in m]
        if vals:
            avg[k] = round(sum(vals) / len(vals), 6)
    return avg
