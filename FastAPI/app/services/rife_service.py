"""
RIFE HDv3 model service — singleton loader and inference API.

Loads the pre-trained RIFE HDv3 model once at startup and exposes
an `interpolate()` function for frame interpolation.
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
    if len(img0.shape) == 2:
        img0 = cv2.cvtColor(img0, cv2.COLOR_GRAY2BGR)
    if len(img1.shape) == 2:
        img1 = cv2.cvtColor(img1, cv2.COLOR_GRAY2BGR)
    if img0.shape[2] == 4:
        img0 = cv2.cvtColor(img0, cv2.COLOR_BGRA2BGR)
    if img1.shape[2] == 4:
        img1 = cv2.cvtColor(img1, cv2.COLOR_BGRA2BGR)

    # Convert to tensors [0, 1] range
    t0 = (torch.tensor(img0.transpose(2, 0, 1)).to(device) / 255.0).unsqueeze(0)
    t1 = (torch.tensor(img1.transpose(2, 0, 1)).to(device) / 255.0).unsqueeze(0)

    # Pad to multiples of 32
    n, c, h, w = t0.shape
    ph = ((h - 1) // 32 + 1) * 32
    pw = ((w - 1) // 32 + 1) * 32
    padding = (0, pw - w, 0, ph - h)
    t0 = F.pad(t0, padding)
    t1 = F.pad(t1, padding)

    # Run recursive interpolation
    logger.info("Running RIFE interpolation with exp=%d ...", exp)
    img_list = [t0, t1]
    for i in range(exp):
        tmp = []
        for j in range(len(img_list) - 1):
            mid = model.inference(img_list[j], img_list[j + 1])
            tmp.append(img_list[j])
            tmp.append(mid)
        tmp.append(t1)
        img_list = tmp

    # Pick the middle frame
    mid_index = len(img_list) // 2
    middle_frame = img_list[mid_index]

    # Convert back to numpy and save
    result = (middle_frame[0] * 255).byte().cpu().numpy().transpose(1, 2, 0)[:h, :w]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), result)

    logger.info("Interpolated frame saved to %s", output_path)
    return output_path
