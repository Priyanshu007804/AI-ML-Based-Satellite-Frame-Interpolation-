"""
Animation / time-lapse generation service.

Creates MP4/GIF animations from satellite frame sequences,
supporting side-by-side comparisons (original vs interpolated).
"""

import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.config import ANIMATION_DIR

logger = logging.getLogger(__name__)


def generate_timelapse(
    frame_paths: list[str],
    output_path: str | Path,
    fps: int = 4,
    labels: Optional[list[str]] = None,
    title: str = "",
) -> Path:
    """Generate a time-lapse MP4 video from a sequence of frames.

    Args:
        frame_paths: Ordered list of frame image paths.
        output_path: Output MP4 file path.
        fps: Frames per second (default 4 for satellite data).
        labels: Optional timestamp labels for each frame.
        title: Optional title overlay.

    Returns:
        Path to the generated video.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not frame_paths:
        raise ValueError("No frames provided for animation")

    # Read first frame to get dimensions
    first = cv2.imread(frame_paths[0])
    if first is None:
        raise RuntimeError(f"Cannot read first frame: {frame_paths[0]}")

    h, w = first.shape[:2]

    # Limit dimensions for web playback
    max_dim = 1024
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        w = int(w * scale)
        h = int(h * scale)
        # Ensure even dimensions for codec
        w = w - (w % 2)
        h = h - (h % 2)

    # Use mp4v codec (widely compatible)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

    for i, fpath in enumerate(frame_paths):
        frame = cv2.imread(fpath)
        if frame is None:
            logger.warning("Skipping unreadable frame: %s", fpath)
            continue

        frame = cv2.resize(frame, (w, h), interpolation=cv2.INTER_AREA)

        # Add label overlay
        if labels and i < len(labels):
            _add_text_overlay(frame, labels[i], position="bottom")

        if title:
            _add_text_overlay(frame, title, position="top")

        writer.write(frame)

    writer.release()
    logger.info("Generated timelapse: %s (%d frames, %d fps)", output_path, len(frame_paths), fps)
    return output_path


def generate_comparison_animation(
    original_paths: list[str],
    interpolated_paths: list[str],
    output_path: str | Path,
    fps: int = 4,
    original_labels: Optional[list[str]] = None,
    interpolated_labels: Optional[list[str]] = None,
) -> Path:
    """Generate a side-by-side comparison video (original vs interpolated).

    Args:
        original_paths: Paths to original (lower temporal res) frames.
        interpolated_paths: Paths to the full enhanced sequence.
        output_path: Output MP4 file path.
        fps: Frames per second.
        original_labels: Labels for original frames.
        interpolated_labels: Labels for interpolated frames.

    Returns:
        Path to the generated comparison video.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not original_paths or not interpolated_paths:
        raise ValueError("Both original and interpolated frame lists must be non-empty")

    # Read first frame for dimensions
    first = cv2.imread(original_paths[0])
    if first is None:
        raise RuntimeError(f"Cannot read frame: {original_paths[0]}")

    h, w = first.shape[:2]

    # Scale down for web
    max_dim = 512
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        w = int(w * scale)
        h = int(h * scale)
    w = w - (w % 2)
    h = h - (h % 2)

    # Side-by-side width
    combined_w = w * 2 + 4  # 4px divider
    combined_w = combined_w - (combined_w % 2)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (combined_w, h))

    # The interpolated sequence is longer — for each interpolated frame,
    # show the nearest original frame on the left
    num_interpolated = len(interpolated_paths)
    num_original = len(original_paths)

    for i in range(num_interpolated):
        # Map interpolated index to nearest original index
        orig_idx = min(int(i * (num_original - 1) / max(num_interpolated - 1, 1)), num_original - 1)

        # Read frames
        left = cv2.imread(original_paths[orig_idx])
        right = cv2.imread(interpolated_paths[i])

        if left is None or right is None:
            continue

        left = cv2.resize(left, (w, h), interpolation=cv2.INTER_AREA)
        right = cv2.resize(right, (w, h), interpolation=cv2.INTER_AREA)

        # Add labels
        _add_text_overlay(left, "Original", position="top", color=(100, 180, 255))
        _add_text_overlay(right, "Enhanced", position="top", color=(100, 255, 180))

        if original_labels and orig_idx < len(original_labels):
            _add_text_overlay(left, original_labels[orig_idx], position="bottom")
        if interpolated_labels and i < len(interpolated_labels):
            _add_text_overlay(right, interpolated_labels[i], position="bottom")

        # Create divider
        divider = np.zeros((h, 4, 3), dtype=np.uint8)
        divider[:, :] = [80, 80, 80]

        # Combine side by side
        combined = np.hstack([left, divider, right])

        # Ensure width matches
        if combined.shape[1] != combined_w:
            combined = cv2.resize(combined, (combined_w, h))

        writer.write(combined)

    writer.release()
    logger.info("Generated comparison animation: %s", output_path)
    return output_path


def generate_gif(
    frame_paths: list[str],
    output_path: str | Path,
    fps: int = 3,
    max_size: int = 480,
) -> Path:
    """Generate a lightweight GIF from frame sequence (for web preview).

    Args:
        frame_paths: List of frame image paths.
        output_path: Output GIF file path.
        fps: Frames per second.
        max_size: Maximum dimension (width or height).

    Returns:
        Path to the generated GIF.
    """
    try:
        import imageio.v3 as iio
    except ImportError:
        import imageio as iio

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    frames = []
    for fpath in frame_paths:
        img = cv2.imread(fpath)
        if img is None:
            continue

        h, w = img.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))

        # Convert BGR to RGB for GIF
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        frames.append(rgb)

    if not frames:
        raise ValueError("No valid frames for GIF generation")

    duration = 1000 // fps  # ms per frame

    try:
        # imageio v3
        iio.imwrite(str(output_path), frames, duration=duration, loop=0)
    except (TypeError, AttributeError):
        # imageio v2 fallback
        import imageio
        imageio.mimsave(str(output_path), frames, duration=duration / 1000, loop=0)

    logger.info("Generated GIF: %s (%d frames)", output_path, len(frames))
    return output_path


def frames_to_base64_sequence(frame_paths: list[str], max_size: int = 512) -> list[str]:
    """Convert frame images to base64 strings for web playback.

    This avoids generating video files — the frontend can animate
    frames directly using JavaScript.

    Args:
        frame_paths: List of frame image paths.
        max_size: Maximum dimension for each frame.

    Returns:
        List of base64-encoded PNG strings.
    """
    import base64

    result = []
    for fpath in frame_paths:
        img = cv2.imread(fpath)
        if img is None:
            continue

        h, w = img.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))

        _, buffer = cv2.imencode('.png', img)
        b64 = base64.b64encode(buffer).decode('utf-8')
        result.append(f"data:image/png;base64,{b64}")

    return result


def _add_text_overlay(
    frame: np.ndarray,
    text: str,
    position: str = "bottom",
    color: tuple = (255, 255, 255),
    font_scale: float = 0.5,
):
    """Add a text overlay with background to a frame (in-place).

    Args:
        frame: BGR image (modified in-place).
        text: Text string to overlay.
        position: 'top' or 'bottom'.
        color: BGR text color.
        font_scale: Font size scale.
    """
    h, w = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    thickness = 1

    (text_w, text_h), baseline = cv2.getTextSize(text, font, font_scale, thickness)

    if position == "top":
        y = text_h + 10
        bg_y1 = 0
        bg_y2 = text_h + 20
    else:
        y = h - 10
        bg_y1 = h - text_h - 20
        bg_y2 = h

    x = 10

    # Semi-transparent background
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, bg_y1), (w, bg_y2), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    # Text
    cv2.putText(frame, text, (x, y), font, font_scale, color, thickness, cv2.LINE_AA)
