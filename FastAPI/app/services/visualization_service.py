"""
Visualization service.

Generates Cloud Motion Heatmaps and Optical Flow visualizations
from satellite image frames.
"""

import logging
from pathlib import Path

import cv2
import numpy as np

# Use non-interactive backend for matplotlib in a server environment
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

logger = logging.getLogger(__name__)


def generate_cloud_motion_heatmap(frame1_path: str | Path, frame2_path: str | Path, output_path: str | Path) -> None:
    """
    Generate a heatmap representing absolute difference between two frames.

    Args:
        frame1_path: Path to the first image.
        frame2_path: Path to the second image.
        output_path: Path to save the resulting heatmap image.
    """
    logger.info("Generating Cloud Motion Heatmap...")
    img1 = cv2.imread(str(frame1_path), cv2.IMREAD_COLOR)
    img2 = cv2.imread(str(frame2_path), cv2.IMREAD_COLOR)

    if img1 is None or img2 is None:
        raise ValueError("Could not read one or both input images for heatmap generation.")

    # Resize img2 to match img1 if necessary
    if img1.shape[:2] != img2.shape[:2]:
        img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]), interpolation=cv2.INTER_AREA)

    # Compute absolute difference
    diff = np.abs(img2.astype(float) - img1.astype(float))
    
    # Calculate mean across channels for heatmap
    diff_mean = diff.mean(axis=2)

    # Plot
    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(diff_mean, cmap='hot')
    ax.axis('off')
    fig.colorbar(im, ax=ax, label='Absolute Pixel Difference')
    
    plt.savefig(str(output_path), bbox_inches='tight', pad_inches=0, dpi=150)
    plt.close(fig)
    logger.info(f"Heatmap saved to {output_path}")


def generate_optical_flow(frame1_path: str | Path, frame2_path: str | Path, output_path: str | Path) -> None:
    """
    Generate an Optical Flow visualization using Farneback method and quiver plot.

    Args:
        frame1_path: Path to the first image.
        frame2_path: Path to the second image.
        output_path: Path to save the resulting optical flow image.
    """
    logger.info("Generating Optical Flow Visualization...")
    # Read as grayscale for Farneback
    gray1 = cv2.imread(str(frame1_path), cv2.IMREAD_GRAYSCALE)
    gray2 = cv2.imread(str(frame2_path), cv2.IMREAD_GRAYSCALE)
    
    # Also read original color for background
    img1_color = cv2.imread(str(frame1_path), cv2.IMREAD_COLOR)
    img1_color = cv2.cvtColor(img1_color, cv2.COLOR_BGR2RGB) # For matplotlib

    if gray1 is None or gray2 is None:
        raise ValueError("Could not read one or both input images for optical flow generation.")

    # Resize img2 to match img1 if necessary
    if gray1.shape != gray2.shape:
        gray2 = cv2.resize(gray2, (gray1.shape[1], gray1.shape[0]), interpolation=cv2.INTER_AREA)

    # Calculate dense optical flow using Farneback
    flow = cv2.calcOpticalFlowFarneback(gray1, gray2, None, 0.5, 3, 15, 3, 5, 1.2, 0)

    # Subsample vectors for quiver plot
    step = 80
    h, w = gray1.shape
    y, x = np.mgrid[step/2:h:step, step/2:w:step].reshape(2, -1).astype(int)
    fx, fy = flow[y, x].T

    # Plot
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.imshow(img1_color)
    # Quiver plot: flip y-axis for standard image coordinates
    ax.quiver(x, y, fx, fy, color='red', scale=10, headwidth=5)
    ax.axis('off')

    plt.savefig(str(output_path), bbox_inches='tight', pad_inches=0, dpi=150)
    plt.close(fig)
    logger.info(f"Optical Flow saved to {output_path}")
