"""
Image quality metrics service.

Computes SSIM, MSE, PSNR, and FSIM between the generated interpolated frame
and a reference (either real ground truth or pixel-average of both input frames).
"""

import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
from skimage.metrics import peak_signal_noise_ratio as psnr

logger = logging.getLogger(__name__)


def _load_and_normalize(path: str | Path) -> np.ndarray:
    """Load an image as a float64 array in [0, 1] range.

    Args:
        path: Path to the image file.

    Returns:
        Numpy array of shape (H, W, C) in float64.

    Raises:
        FileNotFoundError: If image cannot be read.
    """
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {path}")
    return img.astype(np.float64) / 255.0


def compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute Structural Similarity Index (SSIM).

    Args:
        img1: First image array (H, W, C) in [0, 1].
        img2: Second image array (H, W, C) in [0, 1].

    Returns:
        SSIM value (higher is better, max 1.0).
    """
    # Determine win_size: must be odd and <= min dimension
    min_dim = min(img1.shape[0], img1.shape[1])
    win_size = min(7, min_dim)
    if win_size % 2 == 0:
        win_size -= 1
    win_size = max(win_size, 3)

    channel_axis = 2 if img1.ndim == 3 else None
    return float(ssim(img1, img2, channel_axis=channel_axis, data_range=1.0, win_size=win_size))


def compute_mse(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute Mean Squared Error (MSE).

    Args:
        img1: First image array.
        img2: Second image array.

    Returns:
        MSE value (lower is better, min 0.0).
    """
    return float(np.mean((img1 - img2) ** 2))


def compute_psnr(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute Peak Signal-to-Noise Ratio (PSNR).

    Args:
        img1: First image array (H, W, C) in [0, 1].
        img2: Second image array (H, W, C) in [0, 1].

    Returns:
        PSNR value in dB (higher is better).
    """
    mse_val = compute_mse(img1, img2)
    if mse_val < 1e-10:
        return float("inf")
    return float(psnr(img1, img2, data_range=1.0))


def compute_fsim(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute Feature Similarity Index (FSIM).

    Uses the `piq` library for GPU/CPU accelerated FSIM computation.
    Falls back to a phase-congruency-based approximation if piq is not available.

    Args:
        img1: First image array (H, W, C) in [0, 1] float64.
        img2: Second image array (H, W, C) in [0, 1] float64.

    Returns:
        FSIM value (higher is better, max 1.0).
    """
    try:
        import torch
        import piq

        # Convert to torch tensors: (N, C, H, W) float32
        t1 = torch.from_numpy(img1.transpose(2, 0, 1)).unsqueeze(0).float()
        t2 = torch.from_numpy(img2.transpose(2, 0, 1)).unsqueeze(0).float()

        fsim_val = piq.fsim(t1, t2, data_range=1.0)
        return float(fsim_val.item())

    except ImportError:
        logger.warning("piq not installed — using gradient-based FSIM approximation")
        return _fsim_fallback(img1, img2)
    except Exception as e:
        logger.warning("FSIM computation failed: %s — using fallback", e)
        return _fsim_fallback(img1, img2)


def _fsim_fallback(img1: np.ndarray, img2: np.ndarray) -> float:
    """Gradient-magnitude-based FSIM approximation (no external dependencies).

    Uses Scharr gradient as a proxy for phase congruency features.

    Args:
        img1: Image array (H, W, C) in [0, 1].
        img2: Image array (H, W, C) in [0, 1].

    Returns:
        Approximate FSIM value.
    """
    # Convert to grayscale
    if img1.ndim == 3:
        g1 = cv2.cvtColor((img1 * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float64) / 255.0
        g2 = cv2.cvtColor((img2 * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float64) / 255.0
    else:
        g1, g2 = img1.astype(np.float64), img2.astype(np.float64)

    # Compute gradient magnitudes using Scharr operator
    gx1 = cv2.Scharr(g1, cv2.CV_64F, 1, 0)
    gy1 = cv2.Scharr(g1, cv2.CV_64F, 0, 1)
    grad1 = np.sqrt(gx1**2 + gy1**2)

    gx2 = cv2.Scharr(g2, cv2.CV_64F, 1, 0)
    gy2 = cv2.Scharr(g2, cv2.CV_64F, 0, 1)
    grad2 = np.sqrt(gx2**2 + gy2**2)

    # Gradient Magnitude Similarity
    T1 = 0.85  # constant for stability
    gms = (2 * grad1 * grad2 + T1) / (grad1**2 + grad2**2 + T1)

    # Luminance similarity
    T2 = 0.03
    lum = (2 * g1 * g2 + T2) / (g1**2 + g2**2 + T2)

    # Weighted by max gradient magnitude (higher gradients = more important)
    weight = np.maximum(grad1, grad2)
    if weight.sum() < 1e-10:
        return 1.0  # identical images

    fsim_val = np.sum(gms * lum * weight) / np.sum(weight)
    return float(np.clip(fsim_val, 0.0, 1.0))


def _ensure_matching_shapes(img1: np.ndarray, img2: np.ndarray, target: np.ndarray):
    """Resize images to match target dimensions if needed."""
    target_h, target_w = target.shape[:2]
    if img1.shape[:2] != (target_h, target_w):
        img1 = cv2.resize(img1, (target_w, target_h), interpolation=cv2.INTER_AREA)
    if img2.shape[:2] != (target_h, target_w):
        img2 = cv2.resize(img2, (target_w, target_h), interpolation=cv2.INTER_AREA)
    return img1, img2


def compute_all_metrics(
    frame1_path: str | Path,
    frame2_path: str | Path,
    generated_path: str | Path,
    ground_truth_path: Optional[str | Path] = None,
) -> dict:
    """Compute SSIM, MSE, PSNR, and FSIM for the generated frame.

    When ground_truth_path is provided, compares against the real
    intermediate frame. Otherwise, uses pixel-average of inputs as reference.

    Args:
        frame1_path: Path to the first input frame.
        frame2_path: Path to the second input frame.
        generated_path: Path to the AI-generated intermediate frame.
        ground_truth_path: Optional path to the real intermediate frame (ground truth).

    Returns:
        Dict with keys 'ssim', 'mse', 'psnr', 'fsim', and 'reference_type'.
    """
    logger.info("Computing quality metrics ...")

    img1 = _load_and_normalize(frame1_path)
    img2 = _load_and_normalize(frame2_path)
    generated = _load_and_normalize(generated_path)

    # Resize to match generated frame dimensions if needed
    img1, img2 = _ensure_matching_shapes(img1, img2, generated)

    # Determine reference
    if ground_truth_path and Path(ground_truth_path).exists():
        reference = _load_and_normalize(ground_truth_path)
        if reference.shape[:2] != generated.shape[:2]:
            reference = cv2.resize(
                reference,
                (generated.shape[1], generated.shape[0]),
                interpolation=cv2.INTER_AREA,
            )
        ref_type = "ground_truth"
        logger.info("Using real ground truth for metrics comparison")
    else:
        reference = (img1 + img2) / 2.0
        ref_type = "pixel_average"
        logger.info("Using pixel-average as reference (no ground truth available)")

    ssim_val = compute_ssim(reference, generated)
    mse_val = compute_mse(reference, generated)
    psnr_val = compute_psnr(reference, generated)
    fsim_val = compute_fsim(reference, generated)

    metrics = {
        "ssim": round(ssim_val, 6),
        "mse": round(mse_val, 6),
        "psnr": round(psnr_val, 4),
        "fsim": round(fsim_val, 6),
        "reference_type": ref_type,
    }

    logger.info("Metrics: %s", metrics)
    return metrics


def compute_metrics_from_arrays(
    generated: np.ndarray,
    reference: np.ndarray,
) -> dict:
    """Compute metrics from numpy arrays directly (for batch processing).

    Args:
        generated: Generated image array (H, W) or (H, W, C) in [0, 1].
        reference: Reference image array in [0, 1].

    Returns:
        Dict with metrics.
    """
    # Ensure 3-channel for consistency
    if generated.ndim == 2:
        generated = cv2.cvtColor((generated * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR).astype(np.float64) / 255.0
    if reference.ndim == 2:
        reference = cv2.cvtColor((reference * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR).astype(np.float64) / 255.0

    # Resize if needed
    if generated.shape != reference.shape:
        reference = cv2.resize(
            reference,
            (generated.shape[1], generated.shape[0]),
            interpolation=cv2.INTER_AREA,
        )

    return {
        "ssim": round(compute_ssim(reference, generated), 6),
        "mse": round(compute_mse(reference, generated), 6),
        "psnr": round(compute_psnr(reference, generated), 4),
        "fsim": round(compute_fsim(reference, generated), 6),
    }
