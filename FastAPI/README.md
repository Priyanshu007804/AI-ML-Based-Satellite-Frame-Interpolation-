# AI-Based Satellite Image Temporal Resolution Enhancement

This repository contains the FastAPI backend for an AI-powered satellite image temporal resolution enhancement system. It utilizes the **RIFE HDv3** deep learning model to take two consecutive satellite images and generate an intermediate interpolated frame, effectively enhancing the temporal resolution of satellite imagery.

## Features

- **FastAPI Backend**: High-performance REST API ready for production.
- **RIFE HDv3 Integration**: Direct Python inference (no subprocess overhead) for smooth frame interpolation.
- **Image Quality Metrics**: Automatically calculates SSIM, MSE, and PSNR comparing the generated frame against a naive baseline (pixel-average of the inputs).
- **Static File Serving**: Generated images are immediately accessible via URL for seamless frontend integration (e.g., Next.js).
- **CORS Configured**: Pre-configured to accept cross-origin requests from frontend applications.

## Project Structure

```
FastAPI/
├── app/
│   ├── config.py             # Centralized configuration & environment variables
│   ├── main.py               # FastAPI application entry point
│   ├── routes/
│   │   ├── health.py         # GET /health endpoint
│   │   └── predict.py        # POST /predict endpoint
│   ├── services/
│   │   ├── metrics_service.py # Calculates SSIM, MSE, PSNR
│   │   └── rife_service.py    # Manages RIFE model loading and inference
│   └── utils/
│       └── file_helpers.py    # Handles file uploads, unique naming, and cleanup
├── model/                    # RIFE model core dependencies
├── train_log/                # Pre-trained RIFE HDv3 weights and definitions
├── inference_img.py          # Original CLI inference script
└── requirements.txt          # Python dependencies
```

## Installation

1. **Clone the repository** (or navigate to the project directory).
2. **Set up a virtual environment** (recommended):
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

Start the FastAPI application using Python:

```bash
python -m app.main
```

The server will start at `http://localhost:8000`. 
Interactive API documentation (Swagger UI) is automatically available at `http://localhost:8000/docs`.

## API Endpoints

### 1. Health Check
Check if the server is running.
- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
      "status": "running"
  }
  ```

### 2. Predict / Interpolate
Upload two consecutive satellite images to generate the intermediate frame.
- **URL**: `/predict`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `frame1` (File): The first satellite image.
  - `frame2` (File): The second satellite image.
  - `exp` (Query, Optional): Interpolation exponent (determines how many frames are generated before picking the middle one). Default is `3`. Range `1-6`.
- **Response**:
  ```json
  {
      "success": true,
      "ssim": 0.884041,
      "mse": 0.000516,
      "psnr": 32.8767,
      "generated_image": "/outputs/interpolated_61a6b0373420.png"
  }
  ```

*Note: The generated image can be accessed directly by appending the `generated_image` path to the server URL, e.g., `http://localhost:8000/outputs/interpolated_61a6b0373420.png`.*

## Example Usage with `curl`

```bash
curl -X 'POST' \
  'http://localhost:8000/predict' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'frame1=@path/to/your/frame1.png;type=image/png' \
  -F 'frame2=@path/to/your/frame2.png;type=image/png'
```
