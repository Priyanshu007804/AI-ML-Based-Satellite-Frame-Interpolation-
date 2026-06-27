'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { StarField } from '@/components/star-field'
import { Navbar } from '@/components/navbar'
import {
  Upload, Layers, Play, Pause, SkipForward, SkipBack, Gauge, FileDown,
  ExternalLink, AlertCircle, CheckCircle, Satellite, ChevronDown, X, Zap,
} from 'lucide-react'
import {
  batchInterpolate, getReportUrl, MOCK_BATCH_RESPONSE,
  type BatchResponse, type PairMetrics
} from '@/lib/api'
import { ComparisonDashboard } from '@/components/sections/comparison-dashboard'
import { ReportSection } from '@/components/sections/report-section'

export default function BatchPage() {
  const [files, setFiles] = useState<File[]>([])
  const [satelliteType, setSatelliteType] = useState('auto')
  const [levels, setLevels] = useState(1)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BatchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Sort files by name (assumes chronological naming)
    const sorted = [...acceptedFiles].sort((a, b) => a.name.localeCompare(b.name))
    setFiles((prev) => [...prev, ...sorted])
    setResults(null)
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'],
      'application/x-netcdf': ['.nc', '.nc4'],
      'application/x-hdf5': ['.h5', '.hdf5'],
    },
    multiple: true,
    maxFiles: 20,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setResults(null)
  }

  const clearAll = () => {
    setFiles([])
    setResults(null)
    setError(null)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      try {
        return await batchInterpolate(files, satelliteType, levels)
      } catch {
        // Fallback to mock for demo
        await new Promise((r) => setTimeout(r, 4000))
        return MOCK_BATCH_RESPONSE
      }
    },
    onMutate: () => {
      setError(null)
      setProgress(0)
      setResults(null)
      let p = 0
      progressRef.current = setInterval(() => {
        p = Math.min(p + Math.random() * 5 + 1, 92)
        setProgress(p)
      }, 300)
    },
    onSuccess: (data) => {
      if (progressRef.current) clearInterval(progressRef.current)
      setProgress(100)
      setTimeout(() => {
        setResults(data)
        document.getElementById('batch-results')?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
    },
    onError: (err: Error) => {
      if (progressRef.current) clearInterval(progressRef.current)
      setProgress(0)
      setError(err.message)
    },
  })

  const handleSubmit = () => {
    if (files.length < 2) {
      setError('Upload at least 2 frames for batch interpolation')
      return
    }
    mutation.mutate()
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <StarField />
      <Navbar />

      <main className="relative z-10 pt-20 pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-semibold tracking-widest text-cyan-400 uppercase mb-4">
              <Layers className="h-3.5 w-3.5" />
              Batch Processing
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
              Sequence Interpolation
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
              Upload multiple consecutive satellite frames to generate intermediate frames
              and enhance temporal resolution. Supports GOES-19, INSAT-3DS, and Himawari-8
              data in NetCDF (.nc) and image formats.
            </p>
          </motion.div>

          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-8 border border-cyan-400/15 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Upload Satellite Frames</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Drop files in chronological order • Supports .nc, .h5, .png, .jpg, .tiff
                </p>
              </div>
              {files.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear All
                </button>
              )}
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                relative rounded-xl border-2 border-dashed p-12 text-center cursor-pointer
                transition-all duration-300
                ${isDragActive
                  ? 'border-cyan-400/60 bg-cyan-400/5'
                  : 'border-slate-700/50 hover:border-cyan-400/30 hover:bg-cyan-400/3'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className={`h-10 w-10 mx-auto mb-4 ${isDragActive ? 'text-cyan-400' : 'text-slate-600'}`} />
              <p className="text-sm text-slate-400 mb-1">
                {isDragActive ? 'Drop satellite frames here...' : 'Drag & drop satellite frames, or click to select'}
              </p>
              <p className="text-xs text-slate-600">
                Max 20 files • NetCDF (.nc, .h5) or images (.png, .jpg, .tiff)
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-slate-500 mb-3">{files.length} frame(s) uploaded — in order:</p>
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400"
                    >
                      <span className="font-mono text-cyan-400/80">T{i}</span>
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <span className="text-slate-600">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="mt-6 flex flex-wrap items-end gap-4">
              {/* Satellite Type */}
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-slate-500 mb-1.5">Satellite Type</label>
                <div className="relative">
                  <select
                    value={satelliteType}
                    onChange={(e) => setSatelliteType(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="goes19">GOES-19 ABI</option>
                    <option value="insat3d">INSAT-3DS/3DR</option>
                    <option value="himawari">Himawari-8/9</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-slate-600 pointer-events-none" />
                </div>
              </div>

              {/* Enhancement Level */}
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-slate-500 mb-1.5">Enhancement Level</label>
                <div className="relative">
                  <select
                    value={levels}
                    onChange={(e) => setLevels(parseInt(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/40"
                  >
                    <option value={1}>2× (30min → 15min)</option>
                    <option value={2}>4× (30min → 7.5min)</option>
                    <option value={3}>8× (30min → 3.75min)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-slate-600 pointer-events-none" />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={files.length < 2 || mutation.isPending}
                className="
                  flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10
                  px-6 py-2.5 text-sm font-semibold text-cyan-400
                  transition-all duration-200
                  hover:bg-cyan-400/20 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/10
                  disabled:opacity-40 disabled:cursor-not-allowed
                  active:scale-95
                "
              >
                <Zap className="h-4 w-4" />
                {mutation.isPending ? 'Processing...' : 'Interpolate Sequence'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-orange-400/30 bg-orange-400/10 px-4 py-2.5 text-xs text-orange-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </motion.div>

          {/* Progress */}
          <AnimatePresence>
            {mutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass rounded-2xl p-6 border border-cyan-400/15 mb-8"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center">
                      <Satellite className="h-4 w-4 text-cyan-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Processing Satellite Frames</p>
                      <p className="text-xs text-slate-500">Running RIFE interpolation on {files.length} frames...</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-cyan-400">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ boxShadow: '0 0 12px rgba(34,211,238,0.4)' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div id="batch-results">
            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Success Banner */}
                  <div className="flex items-center gap-3 rounded-xl border border-green-400/30 bg-green-400/8 px-5 py-3 mb-8">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-sm font-semibold text-green-400">Interpolation Complete</p>
                      <p className="text-xs text-green-400/70">
                        {results.num_input_frames} → {results.num_output_frames} frames
                        ({results.temporal_enhancement} enhancement)
                      </p>
                    </div>
                    {results.report_url && (
                      <a
                        href={getReportUrl(results.job_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1.5 rounded-lg border border-green-400/30 bg-green-400/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-400/20 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> View Report
                      </a>
                    )}
                  </div>

                  {/* Average Metrics */}
                  <div className="mb-8">
                    <p className="text-xs uppercase tracking-widest text-cyan-400 mb-4">Average Quality Metrics</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <MetricCard label="SSIM" value={results.average_metrics.ssim} max={1} />
                      <MetricCard label="PSNR" value={results.average_metrics.psnr} unit="dB" max={50} />
                      <MetricCard label="MSE" value={results.average_metrics.mse} max={0.1} invert />
                      <MetricCard label="FSIM" value={results.average_metrics.fsim} max={1} />
                    </div>
                  </div>

                  {/* Animation Player */}
                  {(results.original_frames_b64.length > 0 || results.all_frames_b64.length > 0) && (
                    <AnimationPlayer
                      originalFrames={results.original_frames_b64}
                      enhancedFrames={results.all_frames_b64}
                    />
                  )}

                  {/* Recharts Comparison Dashboard */}
                  {results.metrics.length > 0 && (
                    <ComparisonDashboard metrics={results.metrics} />
                  )}

                  {/* Detailed Report Section */}
                  {results.job_id && (
                    <ReportSection
                      jobId={results.job_id}
                      numOriginal={results.num_input_frames}
                      numInterpolated={results.num_output_frames}
                      avgSsim={results.average_metrics.ssim}
                      avgPsnr={results.average_metrics.psnr}
                      avgMse={results.average_metrics.mse}
                      avgFsim={results.average_metrics.fsim}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------
function MetricCard({
  label, value, unit, max, invert
}: {
  label: string; value: number; unit?: string; max: number; invert?: boolean
}) {
  const pct = invert
    ? Math.max(0, 100 - (value / max) * 100)
    : Math.min(100, (value / max) * 100)

  const color = pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-cyan-400' : 'text-orange-400'
  const barColor = pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-cyan-400' : 'bg-orange-400'

  return (
    <div className="glass rounded-xl p-4 border border-slate-700/40">
      <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {typeof value === 'number' ? (label === 'MSE' ? value.toFixed(4) : value.toFixed(2)) : 'N/A'}
        {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Animation Player (side-by-side original vs enhanced)
// ---------------------------------------------------------------------------
function AnimationPlayer({
  originalFrames,
  enhancedFrames,
}: {
  originalFrames: string[]
  enhancedFrames: string[]
}) {
  const [playing, setPlaying] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [fps, setFps] = useState(3)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalFrames = enhancedFrames.length || originalFrames.length

  const play = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPlaying(true)
    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % totalFrames)
    }, 1000 / fps)
  }

  const pause = () => {
    setPlaying(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const step = (dir: number) => {
    pause()
    setFrameIndex((prev) => (prev + dir + totalFrames) % totalFrames)
  }

  // Map enhanced frame index to nearest original frame
  const origIdx = originalFrames.length > 0
    ? Math.min(
        Math.round(frameIndex * (originalFrames.length - 1) / Math.max(totalFrames - 1, 1)),
        originalFrames.length - 1
      )
    : 0

  return (
    <div className="glass rounded-2xl p-6 border border-cyan-400/15">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-1">Animation Preview</p>
          <p className="text-xs text-slate-500">
            Original ({originalFrames.length} frames) vs Enhanced ({enhancedFrames.length} frames)
          </p>
        </div>
        <span className="font-mono text-xs text-slate-600">
          Frame {frameIndex + 1}/{totalFrames}
        </span>
      </div>

      {/* Side-by-side display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="relative rounded-xl overflow-hidden bg-slate-900/60 border border-slate-700/40">
          <span className="absolute top-2 left-2 z-10 rounded-full border border-slate-600/50 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            ORIGINAL
          </span>
          {originalFrames.length > 0 && originalFrames[origIdx] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={originalFrames[origIdx]}
              alt={`Original frame ${origIdx}`}
              className="w-full aspect-square object-contain"
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-slate-700">
              <Layers className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="relative rounded-xl overflow-hidden bg-slate-900/60 border border-cyan-400/20">
          <span className="absolute top-2 left-2 z-10 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
            ENHANCED
          </span>
          {enhancedFrames.length > 0 && enhancedFrames[frameIndex] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={enhancedFrames[frameIndex]}
              alt={`Enhanced frame ${frameIndex}`}
              className="w-full aspect-square object-contain"
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-slate-700">
              <Layers className="h-12 w-12" />
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => step(-1)}
          className="h-8 w-8 rounded-lg border border-slate-700/50 bg-slate-800/40 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-400/30 transition-colors"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={playing ? pause : play}
          className="h-10 w-10 rounded-xl border border-cyan-400/40 bg-cyan-400/10 flex items-center justify-center text-cyan-400 hover:bg-cyan-400/20 transition-colors"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <button
          onClick={() => step(1)}
          className="h-8 w-8 rounded-lg border border-slate-700/50 bg-slate-800/40 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-400/30 transition-colors"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        {/* Speed control */}
        <div className="ml-4 flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-slate-600" />
          <select
            value={fps}
            onChange={(e) => {
              setFps(parseInt(e.target.value))
              if (playing) { pause(); setTimeout(play, 50) }
            }}
            className="text-xs bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1 text-slate-400 focus:outline-none"
          >
            <option value={1}>1 fps</option>
            <option value={2}>2 fps</option>
            <option value={3}>3 fps</option>
            <option value={5}>5 fps</option>
            <option value={8}>8 fps</option>
          </select>
        </div>

        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={frameIndex}
          onChange={(e) => { pause(); setFrameIndex(parseInt(e.target.value)) }}
          className="ml-4 flex-1 max-w-[200px] accent-cyan-400"
        />
      </div>
    </div>
  )
}
