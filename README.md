# AI/ML-Based Satellite Frame Interpolation

**ISRO BAH Hackathon 2026 — Team BUGGERS presents INTEREP AI**



An end-to-end web application that leverages Deep Learning optical flow (RIFE HDv3) to interpolate between temporally sparse satellite imagery frames. This project enables researchers and meteorologists to generate high-temporal-resolution satellite data from standard observations.

## 🚨 Problem Statement

Meteorological phenomena like rapidly developing cyclones, severe thunderstorms, and localized cloud bursts require continuous monitoring for accurate prediction and early warning systems. However, Geostationary satellites like INSAT-3DS/3DR and GOES typically capture full-disk or regional images at fixed intervals (e.g., every 15 or 30 minutes). 
This temporal gap often results in missed micro-scale atmospheric events. Capturing higher frequency data inherently requires new hardware or immense bandwidth, making it costly and challenging to implement in real-time.

## 💡 Our Solution

We propose an AI-powered temporal interpolation framework utilizing state-of-the-art Deep Video Frame Interpolation techniques (specifically, RIFE HDv3 optical flow). 
Our solution ingests temporally sparse satellite imagery (e.g., frames at $t$ and $t+1$) and intelligently predicts the missing intermediate frames.
By doing so, we essentially "upsample" the temporal resolution of existing satellite data streams by 2x, 4x, or even 8x without the need for additional satellite hardware or downlink bandwidth. 
This provides forecasters and numerical weather prediction models with a smooth, continuous sequence of weather systems, significantly enhancing the ability to track severe weather in real time.

## ✨ Features

- **Deep Learning Interpolation**: Uses state-of-the-art Video Frame Interpolation (RIFE) to predict missing frames between satellite observations.
- **Broad Satellite Support**: Natively processes NetCDF/HDF5 data from major geostationary satellites:
  - GOES-16 / GOES-19 ABI
  - INSAT-3DS / INSAT-3DR TIR1
  - Himawari-8 / Himawari-9 AHI
- **Scientific Fidelity**: Converts between scientific data arrays and model-ready image formats without losing critical metadata or normalization bounds. Interpolated frames can be saved back to `.nc` format.
- **Interactive Visualization**: A modern React-based frontend to upload sequences, initiate interpolation jobs, and view the original vs. AI-generated frames side-by-side.
- **Quantitative Metrics**: Automatically computes reconstruction metrics (like PSNR/SSIM) when interpolating between known frames to validate model accuracy.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (or standard CSS modules)
- **Role**: Provides an interactive dashboard for users to upload data, view side-by-side comparisons, and analyze metrics.

### Backend & Data Processing
- **Framework**: FastAPI (Python)
- **Data Handling**: `xarray`, `netCDF4`, `h5py` for scientific satellite data parsing.
- **Computer Vision**: OpenCV (`cv2`), NumPy for array manipulation and false-color mapping.
- **Role**: Manages API routing, orchestrates interpolation jobs, and parses/re-exports valid NetCDF files.

### Machine Learning Engine
- **Model**: RIFE HDv3 (Real-Time Intermediate Flow Estimation)
- **Framework**: PyTorch
- **Role**: Predicts intermediate frames by calculating deep optical flow between adjacent temporal observations.

## 🏗️ Architecture

1. **Client Interaction**: The user uploads sparse satellite sequences (NetCDF or PNG format) via the Next.js frontend.
2. **Data Ingestion & Parsing**: The FastAPI backend receives the payload. For scientific formats, `nc_service` extracts the target variables (like CMI or TIR1), handles missing values, and normalizes the raw floating-point data into model-ready tensors.
3. **AI Inference pipeline**: The normalized frames are passed into the PyTorch-based RIFE HDv3 model. The model computes bidirectional optical flows and synthesizes the missing intermediate frames (e.g., generating $t+0.5$ between $t$ and $t+1$).
4. **Reconstruction & Export**: The predicted frames are denormalized back to their original physical ranges. The backend reconstructs valid NetCDF files containing the newly interpolated data and its associated metadata.
5. **Visualization**: The newly generated high-temporal-resolution data is served back to the frontend, allowing meteorologists to scrub through a smooth timeline and view quantitative metrics (PSNR, SSIM) validating the reconstruction.

## 📁 Project Structure

```text
.
├── FastAPI/                 # Python backend API (FastAPI)
│   ├── app/                 # Application logic, services, and routing
│   └── requirements.txt     # Python dependencies
├── Front-end/               # Web application frontend (Next.js / React)
│   ├── components/          # UI Components
│   ├── pages/ (or app/)     # Frontend routing and views
│   └── package.json         # Node.js dependencies
└── Model_and_analysis/      # ML models, training scripts, and Jupyter notebooks
```

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- Required Python libraries: `fastapi`, `xarray`, `netCDF4`, `opencv-python`, `torch`, `numpy`

### 1. Running the Backend

The backend is built with FastAPI and runs the deep learning inference and NetCDF processing.

```bash
cd FastAPI
pip install -r requirements.txt
python -m app.main
```
*(By default, the API will be available at http://localhost:8000)*

### 2. Running the Frontend

The frontend is a Next.js application that provides the user interface.

```bash
cd Front-end
npm install
npm run dev
```
*(By default, the frontend will be available at http://localhost:3000)*

## 🔬 How it Works

1. **Ingestion**: Users upload a sequence of satellite imagery (either as PNGs or raw NetCDF files).
2. **Parsing**: If NetCDF files are used, `nc_service.py` extracts the relevant data variable (e.g., CMI, TIR1, tbb), normalizes it, and maps it to a false-color format suitable for the ML model.
3. **Interpolation**: The backend triggers an inference job where the RIFE model predicts intermediate frames.
4. **Export**: The generated frames are returned to the user interface for playback and can be exported back as strictly formatted NetCDF files using the closest available metadata.
