const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface PredictResponse {
  success: boolean
  generated_image: string
  heatmap: string
  optical_flow: string
  ssim: number
  mse: number
  psnr: number
  fsim: number
  reference_type: string
  generated_nc?: string
  input_type?: string
  satellite_type?: string
  error?: string
}

export interface BatchResponse {
  success: boolean
  job_id: string
  num_input_frames: number
  num_output_frames: number
  temporal_enhancement: string
  levels: number
  metrics: PairMetrics[]
  average_metrics: AverageMetrics
  original_frames_b64: string[]
  all_frames_b64: string[]
  report_url: string
  comparison_video_url: string | null
}

export interface PairMetrics {
  pair_index: number
  ssim: number
  mse: number
  psnr: number
  fsim: number
  frame_before: string
  frame_after: string
}

export interface AverageMetrics {
  ssim: number
  mse: number
  psnr: number
  fsim: number
}

export interface HealthResponse {
  status: string
  model_loaded: boolean
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) throw new Error('Backend not reachable')
  return res.json()
}

export async function predictFrames(
  frame1: File,
  frame2: File,
  groundTruth?: File
): Promise<PredictResponse> {
  const formData = new FormData()
  formData.append('frame1', frame1)
  formData.append('frame2', frame2)
  if (groundTruth) {
    formData.append('ground_truth', groundTruth)
  }

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.detail || errorData.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function batchInterpolate(
  frames: File[],
  satelliteType: string = 'auto',
  levels: number = 1
): Promise<BatchResponse> {
  const formData = new FormData()
  frames.forEach((f) => formData.append('frames', f))

  const params = new URLSearchParams({
    satellite_type: satelliteType,
    levels: levels.toString(),
  })

  const res = await fetch(`${API_BASE_URL}/batch/interpolate?${params}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.detail || errorData.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export function getReportUrl(jobId: string): string {
  return `${API_BASE_URL}/batch/${jobId}/report`
}

export function getOutputUrl(path: string): string {
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

// Mock response for demo purposes when backend is not connected
export const MOCK_RESPONSE: PredictResponse = {
  success: true,
  generated_image: '',
  heatmap: '',
  optical_flow: '',
  ssim: 0.8742,
  mse: 0.0062,
  psnr: 34.21,
  fsim: 0.9123,
  reference_type: 'pixel_average',
}

export const MOCK_BATCH_RESPONSE: BatchResponse = {
  success: true,
  job_id: 'demo_batch',
  num_input_frames: 4,
  num_output_frames: 7,
  temporal_enhancement: '2x',
  levels: 1,
  metrics: [
    { pair_index: 0, ssim: 0.87, mse: 0.006, psnr: 34.2, fsim: 0.91, frame_before: 'frame_0', frame_after: 'frame_1' },
    { pair_index: 1, ssim: 0.89, mse: 0.005, psnr: 35.1, fsim: 0.92, frame_before: 'frame_1', frame_after: 'frame_2' },
    { pair_index: 2, ssim: 0.86, mse: 0.007, psnr: 33.8, fsim: 0.90, frame_before: 'frame_2', frame_after: 'frame_3' },
  ],
  average_metrics: { ssim: 0.873, mse: 0.006, psnr: 34.37, fsim: 0.91 },
  original_frames_b64: [],
  all_frames_b64: [],
  report_url: '',
  comparison_video_url: null,
}
