'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, ImageIcon, X, Zap, FileImage, AlertCircle } from 'lucide-react'

interface UploadCardProps {
  label: string
  frameNumber: 1 | 2
  file: File | null
  preview: string | null
  onDrop: (files: File[]) => void
  onClear: () => void
}

function UploadCard({ label, frameNumber, file, preview, onDrop, onClear }: UploadCardProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxFiles: 1,
    multiple: false,
  })

  return (
    <div className="relative">
      {/* Frame label */}
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-cyan-400">T{frameNumber}</span>
        <span className="text-xs text-slate-400">{label}</span>
        <span className="ml-auto rounded border border-slate-700/50 bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-500">
          PNG · JPG
        </span>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
          isDragActive
            ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/20'
            : file
            ? 'border-cyan-400/50 bg-cyan-400/5'
            : 'border-slate-700/60 bg-slate-800/30 hover:border-cyan-400/40 hover:bg-cyan-400/5'
        }`}
        style={{ minHeight: 220 }}
      >
        <input {...getInputProps()} aria-label={`Upload ${label}`} />

        {preview ? (
          <div className="relative h-full">
            {/* Preview image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Preview of ${label}`}
              className="h-[220px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-space-900/80 via-transparent to-transparent" />
            {/* File info */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2">
                <FileImage className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span className="truncate text-xs text-slate-300">{file?.name}</span>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {file ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                </span>
              </div>
            </div>
            {/* Clear button */}
            <button
              onClick={(e) => { e.stopPropagation(); onClear() }}
              aria-label="Remove image"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-400 transition-colors hover:text-red-400 hover:border-red-400/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[220px] gap-3 p-6 text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-300 ${
              isDragActive
                ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-400'
                : 'border-slate-700/60 bg-slate-800/60 text-slate-500'
            }`}>
              {isDragActive ? <Upload className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            </div>
            <div>
              <p className={`text-sm font-medium transition-colors ${isDragActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                {isDragActive ? 'Drop to upload' : 'Drag & drop or click'}
              </p>
              <p className="mt-1 text-xs text-slate-600">Supports PNG, JPG up to 50 MB</p>
            </div>
          </div>
        )}

        {/* Animated corner */}
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-cyan-400 rounded-br-xl" />
          </motion.div>
        )}
      </div>
    </div>
  )
}

interface UploadSectionProps {
  frame1: File | null
  frame2: File | null
  preview1: string | null
  preview2: string | null
  onFrame1Drop: (files: File[]) => void
  onFrame2Drop: (files: File[]) => void
  onFrame1Clear: () => void
  onFrame2Clear: () => void
  onSubmit: () => void
  isProcessing: boolean
  error: string | null
}

export function UploadSection({
  frame1, frame2, preview1, preview2,
  onFrame1Drop, onFrame2Drop, onFrame1Clear, onFrame2Clear,
  onSubmit, isProcessing, error
}: UploadSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const canSubmit = !!frame1 && !!frame2 && !isProcessing

  return (
    <section id="upload" className="relative py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Input</p>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl text-balance">
            Upload Satellite Frames
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-sm leading-relaxed text-slate-500">
            Provide two consecutive satellite observation frames. The AI model will generate a high-quality intermediate frame.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="glass rounded-2xl p-6 sm:p-8 animate-border-glow"
        >
          {/* Upload cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <UploadCard
              label="First Observation (T1)"
              frameNumber={1}
              file={frame1}
              preview={preview1}
              onDrop={onFrame1Drop}
              onClear={onFrame1Clear}
            />
            {/* Arrow divider */}
            <UploadCard
              label="Second Observation (T2)"
              frameNumber={2}
              file={frame2}
              preview={preview2}
              onDrop={onFrame2Drop}
              onClear={onFrame2Clear}
            />
          </div>

          {/* Arrow between cards on desktop */}
          <div className="mt-4 hidden sm:flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2">
              <span className="text-xs text-slate-500 tracking-wider">AI interpolates intermediate frame at</span>
              <span className="font-mono text-xs font-bold text-cyan-400">T = (T1 + T2) / 2</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-400/8 px-4 py-3 text-sm text-orange-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Submit button */}
          <div className="mt-6 flex justify-center">
            <motion.button
              onClick={onSubmit}
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.03 } : {}}
              whileTap={canSubmit ? { scale: 0.97 } : {}}
              className={`relative inline-flex items-center gap-3 overflow-hidden rounded-xl px-10 py-4 text-sm font-semibold transition-all duration-300 ${
                canSubmit
                  ? 'border border-cyan-400/40 bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-400/20'
                  : 'border border-slate-700/40 bg-slate-800/30 text-slate-600 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Generate Prediction
                  {canSubmit && (
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                  )}
                </>
              )}
            </motion.button>
          </div>

          {/* Helper text */}
          {!frame1 || !frame2 ? (
            <p className="mt-3 text-center text-xs text-slate-600">
              Both frames are required to generate a prediction
            </p>
          ) : null}
        </motion.div>
      </div>
    </section>
  )
}
