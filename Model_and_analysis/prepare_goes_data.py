"""
GOES-19 / GOES-16 Data Downloader and Pre-processor.

Downloads public satellite imagery from AWS S3, processes NetCDF files,
and organizes them into triplets (T-1, T, T+1) for RIFE model fine-tuning.
Designed to run on free-tier environments (e.g., Colab, local machine).
"""

import os
import argparse
import logging
from pathlib import Path
from datetime import datetime, timedelta

import s3fs
import xarray as xr
import numpy as np
import cv2
from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# GOES ABI public buckets (no AWS credentials required)
BUCKETS = {
    "goes16": "noaa-goes16",
    "goes18": "noaa-goes18",
    "goes19": "noaa-goes19"
}

# Cloud and Moisture Imagery - Full Disk
PRODUCT = "ABI-L2-CMIPF"
# Band 13 is TIR ~10.3um (Clean IR Longwave), great for clouds day and night
CHANNEL = 13


def setup_directories(base_dir: str) -> tuple[Path, Path, Path]:
    """Create directory structure for dataset."""
    base = Path(base_dir)
    raw_dir = base / "raw_nc"
    processed_dir = base / "processed_png"
    triplets_dir = base / "triplets"

    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)
    triplets_dir.mkdir(parents=True, exist_ok=True)

    return raw_dir, processed_dir, triplets_dir


def get_s3_files(satellite: str, date: datetime, max_files: int = 24) -> list[str]:
    """Get list of GOES NetCDF files from AWS S3 for a given day."""
    fs = s3fs.S3FileSystem(anon=True)
    bucket = BUCKETS.get(satellite.lower())
    if not bucket:
        raise ValueError(f"Unknown satellite {satellite}")

    # Path format: noaa-goes19/ABI-L2-CMIPF/YYYY/DDD/HH/
    day_of_year = date.timetuple().tm_yday
    prefix = f"{bucket}/{PRODUCT}/{date.year}/{day_of_year:03d}"

    logger.info("Searching S3: %s", prefix)
    all_files = []

    # Iterate through hours
    for hour in range(24):
        hour_prefix = f"{prefix}/{hour:02d}/"
        try:
            files = fs.ls(hour_prefix)
            # Filter for specific channel
            channel_files = [f for f in files if f"C{CHANNEL:02d}" in f]
            all_files.extend(channel_files)
        except Exception as e:
            logger.warning("Error listing %s: %s", hour_prefix, e)

    # Sort files chronologically
    all_files.sort()
    
    if max_files and len(all_files) > max_files:
        # Take a contiguous block of files to ensure we have triplets
        all_files = all_files[:max_files]

    return all_files


def download_file(s3_path: str, output_dir: Path) -> Path:
    """Download a single file from S3."""
    fs = s3fs.S3FileSystem(anon=True)
    filename = Path(s3_path).name
    local_path = output_dir / filename

    if not local_path.exists():
        logger.info("Downloading %s...", filename)
        fs.get(s3_path, str(local_path))
    else:
        logger.debug("Skipping existing file %s", filename)

    return local_path


def process_nc_to_png(nc_path: Path, output_dir: Path, target_size=(1024, 1024)) -> Path:
    """Read GOES NetCDF, normalize TIR to [0,255], and save as PNG."""
    filename = nc_path.name.replace(".nc", ".png")
    png_path = output_dir / filename

    if png_path.exists():
        return png_path

    try:
        ds = xr.open_dataset(nc_path, engine="h5netcdf")
        
        # CMI is the Cloud and Moisture Imagery variable
        if "CMI" not in ds.data_vars:
            ds.close()
            raise ValueError(f"No CMI variable in {nc_path}")

        data = ds["CMI"].values
        # Handle fill values (NaN)
        data = np.nan_to_num(data, nan=0.0)

        # Normalize TIR brightness temperature (typically 180K to 320K)
        # Coldest clouds = highest values (white), warm land/ocean = lowest (black)
        # 180K = cold top, 320K = hot surface
        vmin = 180.0
        vmax = 320.0
        
        # Invert so cold clouds are white (standard TIR presentation)
        normalized = 1.0 - ((data - vmin) / (vmax - vmin))
        normalized = np.clip(normalized, 0, 1)

        # Convert to uint8 grayscale
        img_uint8 = (normalized * 255).astype(np.uint8)

        # Resize for manageable training size
        if target_size:
            img_uint8 = cv2.resize(img_uint8, target_size, interpolation=cv2.INTER_AREA)

        # Save as 3-channel BGR (required for RIFE)
        bgr = cv2.cvtColor(img_uint8, cv2.COLOR_GRAY2BGR)
        cv2.imwrite(str(png_path), bgr)

        ds.close()
        return png_path

    except Exception as e:
        logger.error("Error processing %s: %s", nc_path, e)
        return None


def create_triplets(png_dir: Path, out_dir: Path):
    """Organize sequential frames into triplets (im1, im2, im3) for training.
    im1 = T, im3 = T+2, im2 = T+1 (the ground truth intermediate frame to predict)
    """
    files = sorted(list(png_dir.glob("*.png")))
    logger.info("Found %d PNG frames, creating triplets...", len(files))

    triplet_count = 0
    # We need 3 consecutive frames for a triplet
    for i in range(len(files) - 2):
        im1 = files[i]
        im2 = files[i + 1]
        im3 = files[i + 2]

        # Check if timestamps are continuous (roughly 10 mins apart for GOES Full Disk)
        # GOES filenames contain timestamp: OR_ABI-L2-CMIPF-M6C13_G19_sYYYYJJJHHMMSS...
        # For simplicity, we assume sorted files are continuous here.
        # In a strict pipeline, parse timestamps to ensure no data gaps.

        triplet_dir = out_dir / f"sequence_{triplet_count:04d}"
        triplet_dir.mkdir(exist_ok=True)

        # Link or copy (copy is safer across different filesystems)
        # Rename to standard format expected by dataset loaders
        import shutil
        shutil.copy(im1, triplet_dir / "im1.png")
        shutil.copy(im2, triplet_dir / "im2.png") # Ground truth middle frame
        shutil.copy(im3, triplet_dir / "im3.png")

        triplet_count += 1

    logger.info("Created %d training triplets in %s", triplet_count, out_dir)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download and prepare GOES satellite data for RIFE.")
    parser.add_argument("--satellite", type=str, default="goes19", choices=["goes16", "goes18", "goes19"])
    parser.add_argument("--date", type=str, help="YYYY-MM-DD", default=datetime.utcnow().strftime("%Y-%m-%d"))
    parser.add_argument("--out_dir", type=str, default="./goes_dataset")
    parser.add_argument("--max_files", type=int, default=30, help="Max files to download (30 files = ~5 hours of Full Disk data at 10m intervals)")
    
    args = parser.parse_args()

    date = datetime.strptime(args.date, "%Y-%m-%d")
    raw_dir, png_dir, triplets_dir = setup_directories(args.out_dir)

    # 1. Download
    s3_files = get_s3_files(args.satellite, date, args.max_files)
    logger.info("Downloading %d files...", len(s3_files))
    
    downloaded_nc = []
    for s3f in tqdm(s3_files, desc="Downloading from S3"):
        nc_path = download_file(s3f, raw_dir)
        downloaded_nc.append(nc_path)

    # 2. Process to PNG
    logger.info("Processing NC to PNG...")
    for nc in tqdm(downloaded_nc, desc="NC -> PNG"):
        process_nc_to_png(nc, png_dir)

    # 3. Create triplets
    create_triplets(png_dir, triplets_dir)
    
    logger.info("Dataset preparation complete! Ready for fine-tuning.")
