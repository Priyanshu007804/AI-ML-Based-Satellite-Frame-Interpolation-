"""
NetCDF / HDF5 satellite data service.

Reads and writes satellite imagery in NetCDF format from
GOES-19 ABI, INSAT-3DS/3DR TIR1, and Himawari-8 datasets.
Converts between scientific data and model-ready image arrays.
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lazy-loaded imports (these are heavy — only import when needed)
# ---------------------------------------------------------------------------
def _import_xarray():
    try:
        import xarray as xr
        return xr
    except ImportError:
        raise ImportError(
            "xarray is required for NetCDF support. "
            "Install with: pip install xarray netCDF4 h5py"
        )


def _import_netcdf4():
    try:
        import netCDF4
        return netCDF4
    except ImportError:
        raise ImportError(
            "netCDF4 is required for NetCDF support. "
            "Install with: pip install netCDF4"
        )


# ---------------------------------------------------------------------------
# Satellite-specific variable name mappings
# ---------------------------------------------------------------------------
SATELLITE_VAR_MAP = {
    "goes19": {
        "data_var": "CMI",           # Cloud & Moisture Imagery
        "alt_vars": ["Rad", "DQF", "BCM"],
        "time_var": "t",
        "description": "GOES-19 ABI Channel 13 (TIR 10.3µm)",
    },
    "goes16": {
        "data_var": "CMI",
        "alt_vars": ["Rad"],
        "time_var": "t",
        "description": "GOES-16 ABI",
    },
    "insat3d": {
        "data_var": "TIR1",          # Thermal Infrared 1 (~10.8µm)
        "alt_vars": ["tir1", "BT", "bt", "Tb"],
        "time_var": "time",
        "description": "INSAT-3DS/3DR TIR1 Channel",
    },
    "himawari": {
        "data_var": "tbb",           # Brightness Temperature
        "alt_vars": ["tbb_13", "B13", "band_13"],
        "time_var": "time",
        "description": "Himawari-8/9 Band 13 (TIR 10.4µm)",
    },
}


def detect_satellite_type(ds) -> str:
    """Auto-detect satellite type from NetCDF dataset attributes/variables.

    Args:
        ds: xarray.Dataset object.

    Returns:
        Satellite key string (e.g., 'goes19', 'insat3d', 'himawari').
    """
    attrs_str = str(ds.attrs).lower()
    var_names = [v.lower() for v in ds.data_vars]

    # Check for GOES
    if "cmi" in var_names or "goes" in attrs_str or "abi" in attrs_str:
        if "goes-19" in attrs_str or "goes19" in attrs_str or "g19" in attrs_str:
            return "goes19"
        return "goes16"  # fallback to GOES-16 format (same structure)

    # Check for INSAT
    if "tir1" in var_names or "insat" in attrs_str or "mosdac" in attrs_str:
        return "insat3d"

    # Check for Himawari
    if "tbb" in var_names or "himawari" in attrs_str or "ahi" in attrs_str:
        return "himawari"

    # Fallback: try to find any 2D variable that looks like image data
    logger.warning("Could not auto-detect satellite type. Using generic reader.")
    return "generic"


def read_nc_as_array(
    nc_path: str | Path,
    satellite_type: Optional[str] = None,
) -> tuple[np.ndarray, dict]:
    """Read a NetCDF/HDF5 satellite file and return as a normalized numpy array.

    Args:
        nc_path: Path to the .nc or .h5 file.
        satellite_type: Optional override (e.g., 'goes19', 'insat3d', 'himawari').

    Returns:
        Tuple of (image_array, metadata_dict).
        image_array is float32, shape (H, W), values in [0, 1].
        metadata_dict contains original data range, units, time, projection info.
    """
    xr = _import_xarray()
    nc_path = Path(nc_path)

    if not nc_path.exists():
        raise FileNotFoundError(f"NetCDF file not found: {nc_path}")

    logger.info("Reading NetCDF file: %s", nc_path)

    # Open dataset — try netcdf4 first, then h5netcdf
    try:
        ds = xr.open_dataset(str(nc_path), engine="netcdf4")
    except Exception:
        try:
            ds = xr.open_dataset(str(nc_path), engine="h5netcdf")
        except Exception:
            ds = xr.open_dataset(str(nc_path))

    # Auto-detect satellite type
    if satellite_type is None:
        satellite_type = detect_satellite_type(ds)

    logger.info("Detected satellite type: %s", satellite_type)

    # Find the data variable
    data_var = None
    if satellite_type in SATELLITE_VAR_MAP:
        mapping = SATELLITE_VAR_MAP[satellite_type]
        candidates = [mapping["data_var"]] + mapping["alt_vars"]
        for var_name in candidates:
            # Case-insensitive match
            for actual_var in ds.data_vars:
                if actual_var.lower() == var_name.lower():
                    data_var = actual_var
                    break
            if data_var:
                break

    # Fallback: find largest 2D variable
    if data_var is None:
        logger.warning("Primary variable not found. Searching for largest 2D array...")
        max_size = 0
        for var_name in ds.data_vars:
            var = ds[var_name]
            if len(var.dims) >= 2:
                size = np.prod(var.shape)
                if size > max_size:
                    max_size = size
                    data_var = var_name

    if data_var is None:
        ds.close()
        raise ValueError(
            f"Could not find image data in {nc_path}. "
            f"Available variables: {list(ds.data_vars)}"
        )

    logger.info("Using data variable: '%s'", data_var)

    # Extract the data array
    data = ds[data_var].values

    # Squeeze out extra dimensions (time, band, etc.)
    while data.ndim > 2:
        data = data[0]  # take first slice along leading dims

    # Convert to float32
    data = data.astype(np.float32)

    # Handle fill/missing values
    if hasattr(ds[data_var], '_FillValue'):
        fill_val = float(ds[data_var].attrs.get('_FillValue', -999))
        data[data == fill_val] = np.nan
    data = np.nan_to_num(data, nan=0.0)

    # Store metadata before normalization
    metadata = {
        "satellite_type": satellite_type,
        "variable": data_var,
        "original_min": float(np.nanmin(data)),
        "original_max": float(np.nanmax(data)),
        "shape": data.shape,
        "source_file": nc_path.name,
    }

    # Extract units
    if "units" in ds[data_var].attrs:
        metadata["units"] = str(ds[data_var].attrs["units"])

    # Extract time info
    for time_key in ["t", "time", "date_created", "time_coverage_start"]:
        if time_key in ds.coords:
            try:
                metadata["time"] = str(ds.coords[time_key].values)
            except Exception:
                pass
            break
        if time_key in ds.attrs:
            metadata["time"] = str(ds.attrs[time_key])
            break

    # Extract global attributes for metadata
    for attr_key in ["title", "summary", "platform_ID", "instrument_type",
                     "spatial_resolution", "scene_id"]:
        if attr_key in ds.attrs:
            metadata[attr_key] = str(ds.attrs[attr_key])

    ds.close()

    # Normalize to [0, 1]
    vmin, vmax = metadata["original_min"], metadata["original_max"]
    if vmax > vmin:
        normalized = (data - vmin) / (vmax - vmin)
    else:
        normalized = np.zeros_like(data)

    # Clip to [0, 1]
    normalized = np.clip(normalized, 0.0, 1.0)

    logger.info(
        "Loaded NC data: shape=%s, original range=[%.2f, %.2f], satellite=%s",
        data.shape, vmin, vmax, satellite_type,
    )

    return normalized, metadata


def array_to_bgr(gray_array: np.ndarray) -> np.ndarray:
    """Convert a [0,1] grayscale array to a BGR uint8 image for the RIFE model.

    Applies a false-color infrared-style colormap for better visualization.

    Args:
        gray_array: 2D float array in [0, 1].

    Returns:
        3-channel BGR uint8 image (H, W, 3).
    """
    # Convert to uint8
    gray_uint8 = (gray_array * 255).astype(np.uint8)

    # Convert to 3-channel BGR (model expects 3 channels)
    bgr = cv2.cvtColor(gray_uint8, cv2.COLOR_GRAY2BGR)

    return bgr


def array_to_colorized(gray_array: np.ndarray, colormap: str = "inferno") -> np.ndarray:
    """Apply a scientific colormap to a grayscale satellite image for visualization.

    Args:
        gray_array: 2D float array in [0, 1].
        colormap: Matplotlib colormap name (default: 'inferno' for TIR).

    Returns:
        3-channel BGR uint8 image (H, W, 3).
    """
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    # Get colormap
    cmap = plt.get_cmap(colormap)

    # Invert for TIR: cold (high BT) = white, warm clouds = dark
    inverted = 1.0 - gray_array

    # Apply colormap (returns RGBA)
    colored = cmap(inverted)[:, :, :3]  # drop alpha

    # Convert to BGR uint8
    bgr = (colored[:, :, ::-1] * 255).astype(np.uint8)

    return bgr


def save_array_as_nc(
    data: np.ndarray,
    output_path: str | Path,
    metadata: dict,
    timestamp: Optional[str] = None,
) -> Path:
    """Save a 2D array back to NetCDF format with proper metadata.

    Denormalizes from [0,1] back to original data range.

    Args:
        data: 2D float array in [0, 1] (model output).
        output_path: Path to save the .nc file.
        metadata: Metadata dict from read_nc_as_array (contains original range).
        timestamp: Optional ISO timestamp for the interpolated frame.

    Returns:
        Path to the saved NetCDF file.
    """
    xr = _import_xarray()
    output_path = Path(output_path)

    # Denormalize back to original range
    vmin = metadata.get("original_min", 0.0)
    vmax = metadata.get("original_max", 1.0)
    denormalized = data * (vmax - vmin) + vmin

    # Ensure 2D
    if denormalized.ndim > 2:
        denormalized = denormalized.squeeze()
    if denormalized.ndim == 3:
        # If it's BGR from model output, take mean to get grayscale
        denormalized = denormalized.mean(axis=2)

    # Create xarray DataArray
    var_name = metadata.get("variable", "interpolated_data")
    da = xr.DataArray(
        denormalized.astype(np.float32),
        dims=["y", "x"],
        name=var_name,
        attrs={
            "long_name": f"Interpolated {var_name}",
            "units": metadata.get("units", "unknown"),
            "source": "RIFE HDv3 AI Frame Interpolation",
            "original_file": metadata.get("source_file", "unknown"),
            "interpolation_method": "Deep Learning Optical Flow (RIFE)",
        }
    )

    # Create dataset
    ds = xr.Dataset({var_name: da})

    # Add global attributes
    ds.attrs["title"] = "AI-Interpolated Satellite Frame"
    ds.attrs["institution"] = "BAH 2026 — Team INTEREP AI"
    ds.attrs["source"] = f"RIFE HDv3 interpolation of {metadata.get('satellite_type', 'satellite')} data"
    ds.attrs["history"] = f"Generated on {datetime.utcnow().isoformat()}Z"
    ds.attrs["satellite_type"] = metadata.get("satellite_type", "unknown")

    if timestamp:
        ds.attrs["interpolated_time"] = timestamp

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(str(output_path))
    ds.close()

    logger.info("Saved interpolated NC file: %s", output_path)
    return output_path


def nc_to_png(nc_path: str | Path, png_path: str | Path, colormap: str = "inferno") -> Path:
    """Convert a NetCDF satellite file to a colorized PNG for visualization.

    Args:
        nc_path: Path to the .nc file.
        png_path: Output path for the PNG.
        colormap: Matplotlib colormap to apply.

    Returns:
        Path to the saved PNG file.
    """
    data, metadata = read_nc_as_array(nc_path)
    colored = array_to_colorized(data, colormap)

    png_path = Path(png_path)
    png_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(png_path), colored)

    logger.info("Converted NC → PNG: %s → %s", nc_path, png_path)
    return png_path


def extract_timestamp_from_nc(nc_path: str | Path) -> Optional[str]:
    """Extract the observation timestamp from a NetCDF file.

    Args:
        nc_path: Path to the NetCDF file.

    Returns:
        ISO timestamp string, or None if not found.
    """
    xr = _import_xarray()
    try:
        ds = xr.open_dataset(str(nc_path))
        # Try common time attributes
        for key in ["t", "time", "date_created", "time_coverage_start"]:
            if key in ds.coords:
                val = str(ds.coords[key].values)
                ds.close()
                return val
            if key in ds.attrs:
                val = str(ds.attrs[key])
                ds.close()
                return val
        ds.close()
    except Exception as e:
        logger.warning("Could not extract timestamp from %s: %s", nc_path, e)
    return None
