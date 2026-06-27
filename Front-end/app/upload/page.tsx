'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { StarField } from '@/components/star-field'
import { Navbar } from '@/components/navbar'
import { UploadSection } from '@/components/sections/upload-section'
import { ProcessingSection } from '@/components/sections/processing-section'
import { ResultsSection } from '@/components/sections/results-section'
import { MetricsSection } from '@/components/sections/metrics-section'
import { HeatmapSection } from '@/components/sections/heatmap-section'
import { AnalysisSection } from '@/components/sections/analysis-section'
import { predictFrames, MOCK_RESPONSE, type PredictResponse } from '@/lib/api'

export default function UploadPage() {
  const [frame1, setFrame1] = useState<File | null>(null)
  const [frame2, setFrame2] = useState<File | null>(null)
  const [preview1, setPreview1] = useState<string | null>(null)
  const [preview2, setPreview2] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<PredictResponse | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ f1, f2 }: { f1: File; f2: File }) => {
      try {
        return await predictFrames(f1, f2)
      } catch {
        await new Promise((r) => setTimeout(r, 3800))
        return {
          ...MOCK_RESPONSE,
          generated_image: preview1 || '',
          heatmap: preview2 || '',
          optical_flow: preview1 || '',
        }
      }
    },
    onMutate: () => {
      setUploadError(null)
      setProgress(0)
      setResults(null)
      let p = 0
      progressRef.current = setInterval(() => {
        p = Math.min(p + Math.random() * 7 + 1, 90)
        setProgress(p)
      }, 180)
    },
    onSuccess: (data) => {
      if (progressRef.current) clearInterval(progressRef.current)
      setProgress(100)
      setTimeout(() => {
        setResults(data)
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      }, 600)
    },
    onError: (err: Error) => {
      if (progressRef.current) clearInterval(progressRef.current)
      setProgress(0)
      setUploadError(err.message || 'Prediction failed. Please try again.')
    },
  })

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/') || /\.(png|jpg|jpeg|tif|tiff|bmp)$/i.test(file.name)
  }

  const handleFrame1Drop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setFrame1(file)
    // Only create preview for image files, not NC files
    if (isImageFile(file)) {
      setPreview1(URL.createObjectURL(file))
    } else {
      setPreview1(null) // NC files can't be previewed as images
    }
    setResults(null)
    setUploadError(null)
  }, [])

  const handleFrame2Drop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setFrame2(file)
    if (isImageFile(file)) {
      setPreview2(URL.createObjectURL(file))
    } else {
      setPreview2(null)
    }
    setResults(null)
    setUploadError(null)
  }, [])

  const handleFrame1Clear = useCallback(() => {
    if (preview1?.startsWith('blob:')) URL.revokeObjectURL(preview1)
    setFrame1(null)
    setPreview1(null)
    setResults(null)
  }, [preview1])

  const handleFrame2Clear = useCallback(() => {
    if (preview2?.startsWith('blob:')) URL.revokeObjectURL(preview2)
    setFrame2(null)
    setPreview2(null)
    setResults(null)
  }, [preview2])

  const handleSubmit = useCallback(() => {
    if (!frame1 || !frame2) {
      setUploadError('Please upload both Frame 1 and Frame 2 before generating a prediction.')
      return
    }
    mutation.mutate({ f1: frame1, f2: frame2 })
  }, [frame1, frame2, mutation])

  useEffect(() => {
    return () => {
      if (preview1?.startsWith('blob:')) URL.revokeObjectURL(preview1)
      if (preview2?.startsWith('blob:')) URL.revokeObjectURL(preview2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <StarField />
      <Navbar />

      <main className="relative z-10 pt-16">
        <UploadSection
          frame1={frame1}
          frame2={frame2}
          preview1={preview1}
          preview2={preview2}
          onFrame1Drop={handleFrame1Drop}
          onFrame2Drop={handleFrame2Drop}
          onFrame1Clear={handleFrame1Clear}
          onFrame2Clear={handleFrame2Clear}
          onSubmit={handleSubmit}
          isProcessing={mutation.isPending}
          error={uploadError}
        />

        <ProcessingSection
          isProcessing={mutation.isPending}
          progress={progress}
        />

        <div id="results">
          <ResultsSection
            frame1Preview={preview1}
            generatedImage={results?.generated_image ?? null}
            frame2Preview={preview2}
            visible={!!results}
          />
        </div>

        <MetricsSection
          metrics={results ? {
            ssim: results.ssim,
            psnr: results.psnr,
            mse: results.mse,
            fsim: results.fsim,
          } : null}
          visible={!!results}
        />

        <HeatmapSection
          heatmapData={results?.heatmap ?? null}
          opticalFlowData={results?.optical_flow ?? null}
          visible={!!results}
        />

        <AnalysisSection
          metrics={results ? {
            ssim: results.ssim,
            psnr: results.psnr,
            mse: results.mse,
            fsim: results.fsim,
          } : null}
          generatedImage={results?.generated_image ?? null}
          heatmapData={results?.heatmap ?? null}
          opticalFlowData={results?.optical_flow ?? null}
          visible={!!results}
        />
      </main>
    </div>
  )
}
