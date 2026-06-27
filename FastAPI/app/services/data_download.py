import os
import logging
from pathlib import Path
from datetime import datetime
import s3fs

logger = logging.getLogger(__name__)

BUCKETS = {
    "goes16": "noaa-goes16",
    "goes18": "noaa-goes18",
    "goes19": "noaa-goes19"
}

PRODUCT = "ABI-L2-CMIPF"
CHANNEL = 13

class DataDownloadService:
    @staticmethod
    def get_goes_files_list(satellite: str, date: datetime, max_files: int = 24) -> list[str]:
        """Get list of GOES NetCDF files from AWS S3 for a given day."""
        fs = s3fs.S3FileSystem(anon=True)
        bucket = BUCKETS.get(satellite.lower())
        if not bucket:
            raise ValueError(f"Unknown satellite {satellite}")

        day_of_year = date.timetuple().tm_yday
        prefix = f"{bucket}/{PRODUCT}/{date.year}/{day_of_year:03d}"

        logger.info(f"Searching S3: {prefix}")
        all_files = []

        for hour in range(24):
            hour_prefix = f"{prefix}/{hour:02d}/"
            try:
                files = fs.ls(hour_prefix)
                channel_files = [f for f in files if f"C{CHANNEL:02d}" in f]
                all_files.extend(channel_files)
            except Exception as e:
                logger.warning(f"Error listing {hour_prefix}: {e}")

        all_files.sort()
        
        if max_files and len(all_files) > max_files:
            all_files = all_files[:max_files]

        return all_files

    @staticmethod
    def download_file(s3_path: str, output_dir: Path) -> Path:
        """Download a single file from S3."""
        fs = s3fs.S3FileSystem(anon=True)
        filename = Path(s3_path).name
        local_path = output_dir / filename

        if not local_path.exists():
            logger.info(f"Downloading {filename}...")
            fs.get(s3_path, str(local_path))
        else:
            logger.debug(f"Skipping existing file {filename}")

        return local_path
