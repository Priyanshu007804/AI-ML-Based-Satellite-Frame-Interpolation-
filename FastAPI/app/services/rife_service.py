"""
RIFE HDv3 model service — singleton loader and inference API.

Loads the pre-trained RIFE HDv3 model once at startup and exposes
an `interpolate()` function for frame interpolation.
Supports both standard images (PNG/JPG) and satellite NetCDF data.
"""

import sys
import logging
from pathlib import Path

import cv2
import torch
import numpy as np
from torch.nn import functional as F

from app.config import PROJECT_ROOT, MODEL_DIR

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ensure project root is on sys.path so that `model.*` and `train_log.*`
# imports inside RIFE_HDv3.py / IFNet_HDv3.py resolve correctly.
# ---------------------------------------------------------------------------
_project_root_str = str(PROJECT_ROOT)
if _project_root_str not in sys.path:
    sys.path.insert(0, _project_root_str)

# ---------------------------------------------------------------------------
# Device selection
# ---------------------------------------------------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.set_grad_enabled(False)
if torch.cuda.is_available():
    torch.backends.cudnn.enabled = True
    torch.backends.cudnn.benchmark = True

# ---------------------------------------------------------------------------
# Singleton model instance
# ---------------------------------------------------------------------------
_model = None


def load_model() -> None:
    """Load the RIFE HDv3 model weights from disk (called once at startup)."""
    global _model

    if _model is not None:
        logger.info("RIFE model already loaded — skipping.")
        return

    logger.info("Loading RIFE HDv3 model from %s ...", MODEL_DIR)

    try:
        from train_log.RIFE_HDv3 import Model
        _model = Model()
        _model.load_model(str(MODEL_DIR), -1)
        logger.info("Loaded RIFE HDv3 model successfully.")
    except Exception as e:
        logger.error("Failed to load RIFE HDv3 model: %s", e)
        raise RuntimeError(f"Model loading failed: {e}") from e

    _model.eval()
    _model.device()
    logger.info("RIFE model ready on device: %s", device)


def get_model():
    """Return the loaded model instance, loading it if necessary."""
    if _model is None:
        load_model()
    return _model


def _prepare_tensor(img: np.ndarray) -> torch.Tensor:
    """Convert a BGR uint8 image to a model-ready tensor.

    Args:
        img: BGR uint8 image (H, W, 3).

    Returns:
        Tensor of shape (1, 3, H, W) in [0, 1].
    """
    return (torch.tensor(img.transpose(2, 0, 1)).to(device) / 255.0).unsqueeze(0)


def _pad_to_32(t: torch.Tensor) -> tuple[torch.Tensor, int, int]:
    """Pad tensor dimensions to multiples of 32.

    Returns:
        Padded tensor, original height, original width.
    """
    n, c, h, w = t.shape
    ph = ((h - 1) // 32 + 1) * 32
    pw = ((w - 1) // 32 + 1) * 32
    padding = (0, pw - w, 0, ph - h)
    return F.pad(t, padding), h, w


def _ensure_bgr3(img: np.ndarray) -> np.ndarray:
    """Ensure image is 3-channel BGR uint8."""
    if img is None:
        raise RuntimeError("Image is None")
    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    if img.shape[2] == 1:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    return img


def interpolate(
    frame1_path: str | Path,
    frame2_path: str | Path,
    output_path: str | Path,
    exp: int = 3,
) -> Path:
    """Run RIFE frame interpolation and save the middle frame.

    Args:
        frame1_path: Path to the first input frame.
        frame2_path: Path to the second input frame.
        output_path: Path where the generated intermediate frame is saved.
        exp: Interpolation exponent — generates 2^exp + 1 frames total,
             picks the middle one. Default 3 → 9 frames, middle = index 4.

    Returns:
        Path to the saved output image.

    Raises:
        FileNotFoundError: If either input image is missing.
        RuntimeError: If inference fails.
    """
    frame1_path = Path(frame1_path)
    frame2_path = Path(frame2_path)
    output_path = Path(output_path)

    if not frame1_path.exists():
        raise FileNotFoundError(f"Frame 1 not found: {frame1_path}")
    if not frame2_path.exists():
        raise FileNotFoundError(f"Frame 2 not found: {frame2_path}")

    model = get_model()

    # Read images with OpenCV
    img0 = cv2.imread(str(frame1_path), cv2.IMREAD_UNCHANGED)
    img1 = cv2.imread(str(frame2_path), cv2.IMREAD_UNCHANGED)

    if img0 is None:
        raise RuntimeError(f"Could not read image: {frame1_path}")
    if img1 is None:
        raise RuntimeError(f"Could not read image: {frame2_path}")

    # Resize img1 to match img0 dimensions if they differ
    if img0.shape[:2] != img1.shape[:2]:
        logger.warning(
            "Image dimensions differ (%s vs %s) — resizing frame2 to match frame1.",
            img0.shape[:2], img1.shape[:2],
        )
        img1 = cv2.resize(img1, (img0.shape[1], img0.shape[0]), interpolation=cv2.INTER_AREA)

    # Ensure both images are 3-channel
    img0 = _ensure_bgr3(img0)
    img1 = _ensure_bgr3(img1)

    result = _run_inference(model, img0, img1, exp)

    # Save result
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), result)

    logger.info("Interpolated frame saved to %s", output_path)
    return output_path


def interpolate_arrays(
    img0: np.ndarray,
    img1: np.ndarray,
    exp: int = 1,
) -> np.ndarray:
    """Run RIFE interpolation on numpy arrays directly.

    This is used by batch_service for processing without file I/O.

    Args:
        img0: First frame as BGR uint8 (H, W, 3).
        img1: Second frame as BGR uint8 (H, W, 3).
        exp: Interpolation exponent. Default 1 → single middle frame.

    Returns:
        Middle interpolated frame as BGR uint8 (H, W, 3).
    """
    model = get_model()

    # Ensure matching dimensions
    if img0.shape[:2] != img1.shape[:2]:
        img1 = cv2.resize(img1, (img0.shape[1], img0.shape[0]), interpolation=cv2.INTER_AREA)

    img0 = _ensure_bgr3(img0)
    img1 = _ensure_bgr3(img1)

    return _run_inference(model, img0, img1, exp)


def interpolate_arrays_multi(
    img0: np.ndarray,
    img1: np.ndarray,
    num_intermediate: int = 1,
) -> list[np.ndarray]:
    """Generate multiple intermediate frames between two images.

    Args:
        img0: First frame as BGR uint8 (H, W, 3).
        img1: Second frame as BGR uint8 (H, W, 3).
        num_intermediate: Number of intermediate frames to generate.

    Returns:
        List of intermediate frames (excludes input frames).
    """
    model = get_model()

    if img0.shape[:2] != img1.shape[:2]:
        img1 = cv2.resize(img1, (img0.shape[1], img0.shape[0]), interpolation=cv2.INTER_AREA)

    img0 = _ensure_bgr3(img0)
    img1 = _ensure_bgr3(img1)

    t0 = _prepare_tensor(img0)
    t1 = _prepare_tensor(img1)
    t0, h, w = _pad_to_32(t0)
    t1 = F.pad(t1, (0, t0.shape[3] - img1.shape[1], 0, t0.shape[2] - img1.shape[0]))

    results = []
    for i in range(1, num_intermediate + 1):
        ratio = i / (num_intermediate + 1)
        # Use bisection-based ratio interpolation
        mid = _ratio_inference(model, t0, t1, ratio)
        result = (mid[0] * 255).byte().cpu().numpy().transpose(1, 2, 0)[:h, :w]
        results.append(result)

    return results


def _run_inference(model, img0: np.ndarray, img1: np.ndarray, exp: int) -> np.ndarray:
    """Core inference loop shared by interpolate() and interpolate_arrays().

    Returns:
        Middle frame as BGR uint8 (H, W, 3).
    """
    t0 = _prepare_tensor(img0)
    t1 = _prepare_tensor(img1)

    t0, h, w = _pad_to_32(t0)
    # Re-pad t1 to match t0's padded size
    _, _, ph, pw = t0.shape
    t1_padded = F.pad(
        _prepare_tensor(img1),
        (0, pw - img1.shape[1], 0, ph - img1.shape[0])
    )

    # Run recursive interpolation
    logger.info("Running RIFE interpolation with exp=%d ...", exp)
    img_list = [t0, t1_padded]
    for i in range(exp):
        tmp = []
        for j in range(len(img_list) - 1):
            mid = model.inference(img_list[j], img_list[j + 1])
            tmp.append(img_list[j])
            tmp.append(mid)
        tmp.append(t1_padded)
        img_list = tmp

    # Pick the middle frame
    mid_index = len(img_list) // 2
    middle_frame = img_list[mid_index]

    # Convert back to numpy
    result = (middle_frame[0] * 255).byte().cpu().numpy().transpose(1, 2, 0)[:h, :w]
    return result


def _ratio_inference(
    model, t0: torch.Tensor, t1: torch.Tensor, ratio: float,
    threshold: float = 0.02, max_cycles: int = 8,
) -> torch.Tensor:
    """Interpolate at a specific ratio between two frames using bisection.

    Args:
        model: RIFE model.
        t0: First frame tensor.
        t1: Second frame tensor.
        ratio: Target ratio (0.0 = t0, 1.0 = t1).
        threshold: Ratio precision threshold.
        max_cycles: Maximum bisection iterations.

    Returns:
        Interpolated frame tensor.
    """
    if ratio <= threshold / 2:
        return t0
    if ratio >= 1.0 - threshold / 2:
        return t1

    img0_ratio = 0.0
    img1_ratio = 1.0
    tmp_img0 = t0
    tmp_img1 = t1

    for _ in range(max_cycles):
        middle = model.inference(tmp_img0, tmp_img1)
        middle_ratio = (img0_ratio + img1_ratio) / 2
        if ratio - threshold / 2 <= middle_ratio <= ratio + threshold / 2:
            break
        if ratio > middle_ratio:
            tmp_img0 = middle
            img0_ratio = middle_ratio
        else:
            tmp_img1 = middle
            img1_ratio = middle_ratio

    return middle
