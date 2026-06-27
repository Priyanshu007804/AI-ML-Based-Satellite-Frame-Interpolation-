const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface PredictResponse {
  success: boolean
  generated_image: string
  heatmap: string
  optical_flow: string
  ssim: number
  mse: number
  psnr: number
  error?: string
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

export async function predictFrames(frame1: File, frame2: File): Promise<PredictResponse> {
  const formData = new FormData()
  formData.append('frame1', frame1)
  formData.append('frame2', frame2)

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// Mock response for demo purposes when backend is not connected
export const MOCK_RESPONSE: PredictResponse = {
  success: true,
  generated_image: '',  // Will be filled with placeholder
  heatmap: '',
  optical_flow: '',
  ssim: 0.8742,
  mse: 0.0062,
  psnr: 34.21,
}
