"""
Image quality metrics service.

Computes SSIM, MSE, and PSNR between the generated interpolated frame
and a reference (pixel-average of both input frames).
"""

import logging
from pathlib import Path

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

    return float(ssim(img1, img2, channel_axis=2, data_range=1.0, win_size=win_size))


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


def compute_all_metrics(
    frame1_path: str | Path,
    frame2_path: str | Path,
    generated_path: str | Path,
) -> dict:
    """Compute SSIM, MSE, and PSNR for the generated frame.

    The reference is the pixel-average of frame1 and frame2 (naive
    baseline). Metrics measure how the AI-interpolated frame compares
    to this simple blend.

    Args:
        frame1_path: Path to the first input frame.
        frame2_path: Path to the second input frame.
        generated_path: Path to the AI-generated intermediate frame.

    Returns:
        Dict with keys 'ssim', 'mse', 'psnr'.
    """
    logger.info("Computing quality metrics ...")

    img1 = _load_and_normalize(frame1_path)
    img2 = _load_and_normalize(frame2_path)
    generated = _load_and_normalize(generated_path)

    # Resize to match generated frame dimensions if needed
    target_h, target_w = generated.shape[:2]
    if img1.shape[:2] != (target_h, target_w):
        img1 = cv2.resize(img1, (target_w, target_h), interpolation=cv2.INTER_AREA)
    if img2.shape[:2] != (target_h, target_w):
        img2 = cv2.resize(img2, (target_w, target_h), interpolation=cv2.INTER_AREA)

    # Reference = average of both input frames
    reference = (img1 + img2) / 2.0

    ssim_val = compute_ssim(reference, generated)
    mse_val = compute_mse(reference, generated)
    psnr_val = compute_psnr(reference, generated)

    metrics = {
        "ssim": round(ssim_val, 6),
        "mse": round(mse_val, 6),
        "psnr": round(psnr_val, 4),
    }

    logger.info("Metrics: %s", metrics)
    return metrics
