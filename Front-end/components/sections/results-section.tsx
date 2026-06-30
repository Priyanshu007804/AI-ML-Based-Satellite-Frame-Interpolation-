'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Download, ZoomIn, Layers } from 'lucide-react'
import { getOutputUrl } from '@/lib/api'

interface ResultFrame {
  label: string
  sublabel: string
  imageData: string | null
  tag: string
  tagColor: string
}

interface ResultsSectionProps {
  frame1Preview: string | null
  generatedImage: string | null
  frame2Preview: string | null
  visible: boolean
}

function AnimationPlayer({ frames, fps, title, subtitle }: { frames: (string | null)[], fps: number, title: string, subtitle: string }) {
  const validFrames = frames.filter(f => f !== null) as string[]
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (validFrames.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validFrames.length)
    }, 1000 / fps)
    return () => clearInterval(interval)
  }, [validFrames.length, fps])

  if (validFrames.length === 0) return null

  return (
    <div className="glass rounded-2xl overflow-hidden border border-slate-700/40 p-5 flex flex-col transition-all duration-300 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-400/10">
      <div className="relative overflow-hidden bg-slate-900/60 rounded-xl mb-5" style={{ aspectRatio: '1/1' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getOutputUrl(validFrames[currentIndex])}
          alt={title}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-white font-mono shadow-xl">
          Frame {currentIndex + 1} / {validFrames.length}
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-base font-bold text-slate-100">{title}</h3>
        <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase mt-1.5">{subtitle}</p>
      </div>
    </div>
  )
}


function FrameCard({ frame, index }: { frame: ResultFrame; index: number }) {
  const handleDownload = () => {
    if (!frame.imageData) return
    const link = document.createElement('a')
    link.href = getOutputUrl(frame.imageData)
    link.download = `${frame.label.toLowerCase().replace(/ /g, '_')}.png`
    link.click()
  }

  const imgSrc = frame.imageData ? getOutputUrl(frame.imageData) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      className="group relative flex flex-col"
    >
      <div className="glass rounded-2xl overflow-hidden border border-slate-700/40 transition-all duration-300 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-400/10">
        {/* Image area */}
        <div className="relative overflow-hidden bg-slate-900/60" style={{ aspectRatio: '1/1' }}>
          {imgSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt={frame.label}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-space-900/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {/* Zoom icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 border border-cyan-400/30">
                  <ZoomIn className="h-4 w-4 text-cyan-400" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center">
              <Layers className="h-12 w-12 text-slate-700" />
            </div>
          )}

          {/* Tag */}
          <div className="absolute top-3 left-3">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wider ${frame.tagColor}`}>
              {frame.tag}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">{frame.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{frame.sublabel}</p>
          </div>
          {imgSrc && (
            <button
              onClick={handleDownload}
              aria-label={`Download ${frame.label}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-400"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Arrow between cards */}
      {index < 2 && (
        <div className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-1">
          <div className="h-px w-8 bg-gradient-to-r from-cyan-400/40 to-purple-400/40" />
          <svg className="h-2.5 w-2.5 text-cyan-400/60" fill="currentColor" viewBox="0 0 8 8">
            <path d="M0 0l8 4-8 4z" />
          </svg>
        </div>
      )}
    </motion.div>
  )
}

export function ResultsSection({ frame1Preview, generatedImage, frame2Preview, visible }: ResultsSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const frames: ResultFrame[] = [
    {
      label: 'Frame 1 (T₁)',
      sublabel: 'First satellite observation',
      imageData: frame1Preview,
      tag: 'INPUT',
      tagColor: 'border-slate-600/50 bg-slate-800/60 text-slate-400',
    },
    {
      label: 'Predicted Frame (T₁.₅)',
      sublabel: 'AI-generated intermediate frame',
      imageData: generatedImage,
      tag: 'AI GENERATED',
      tagColor: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-400',
    },
    {
      label: 'Frame 2 (T₂)',
      sublabel: 'Second satellite observation',
      imageData: frame2Preview,
      tag: 'INPUT',
      tagColor: 'border-slate-600/50 bg-slate-800/60 text-slate-400',
    },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          id="results"
          className="py-24 px-4 sm:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <motion.div
              ref={ref}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Output</p>
              <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl text-balance">
                Result Dashboard
              </h2>
              <p className="mt-4 max-w-lg mx-auto text-sm leading-relaxed text-slate-500">
                Compare the AI-generated intermediate frame against the original observations.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:gap-6">
              {frames.map((frame, i) => (
                <FrameCard key={frame.label} frame={frame} index={i} />
              ))}
            </div>

            {/* Time-lapse Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-20 pt-16 border-t border-slate-800"
            >
              <div className="text-center mb-10">
                <p className="text-xs uppercase tracking-widest text-purple-400 mb-3">Animation</p>
                <h3 className="font-heading text-2xl font-bold text-white sm:text-3xl">Time-Lapse Comparison</h3>
                <p className="text-sm text-slate-500 mt-3 max-w-lg mx-auto">
                  Watch the temporal resolution improvement in real-time. The AI model synthesizes nonlinear cloud dynamics seamlessly.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <AnimationPlayer 
                  frames={[frame1Preview, frame2Preview]} 
                  fps={1} 
                  title="Ground Truth (Original)" 
                  subtitle="30-MIN INTERVAL" 
                />
                <AnimationPlayer 
                  frames={[frame1Preview, generatedImage, frame2Preview]} 
                  fps={2} 
                  title="INTEREP AI (Enhanced)" 
                  subtitle="15-MIN INTERVAL" 
                />
              </div>
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
