'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Cpu, Layers, Wind, BarChart3 } from 'lucide-react'

const steps = [
  { icon: Cpu, label: 'Initializing RIFE Model...', color: 'text-cyan-400', duration: 1200 },
  { icon: Wind, label: 'Estimating Optical Flow...', color: 'text-purple-400', duration: 1800 },
  { icon: Layers, label: 'Generating Intermediate Frame...', color: 'text-blue-400', duration: 2400 },
  { icon: BarChart3, label: 'Calculating Quality Metrics...', color: 'text-green-400', duration: 3200 },
]

interface ProcessingSectionProps {
  isProcessing: boolean
  progress: number
}

export function ProcessingSection({ isProcessing, progress }: ProcessingSectionProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStep(0)
      return
    }
    setCurrentStep(0)
    const timers = steps.map((s, i) =>
      setTimeout(() => setCurrentStep(i), s.duration - 800)
    )
    return () => timers.forEach(clearTimeout)
  }, [isProcessing])

  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.5 }}
          className="px-4 sm:px-6 py-8 overflow-hidden"
        >
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 sm:p-8 border border-cyan-400/20 shadow-lg shadow-cyan-400/8"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
                  <Cpu className="h-5 w-5 text-cyan-400" />
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400" />
                  </span>
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-cyan-400 tracking-wider">AI PROCESSING</p>
                  <p className="text-xs text-slate-500">Deep Learning inference in progress</p>
                </div>
                <div className="ml-auto font-mono text-xs font-bold text-cyan-400">
                  {progress.toFixed(0)}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{
                    background: 'linear-gradient(90deg, #22d3ee, #8b5cf6)',
                    boxShadow: '0 0 10px rgba(34,211,238,0.5)',
                  }}
                />
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {steps.map((step, i) => {
                  const isPast = i < currentStep
                  const isCurrent = i === currentStep
                  const isFuture = i > currentStep

                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: isFuture ? 0.35 : 1 }}
                      transition={{ duration: 0.4 }}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-500 ${
                        isCurrent
                          ? 'border-cyan-400/30 bg-cyan-400/8'
                          : isPast
                          ? 'border-green-400/20 bg-green-400/5'
                          : 'border-slate-700/30 bg-slate-800/20'
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-500 ${
                        isCurrent
                          ? 'border border-cyan-400/40 bg-cyan-400/15'
                          : isPast
                          ? 'border border-green-400/30 bg-green-400/10'
                          : 'border border-slate-700/40 bg-slate-800/40'
                      }`}>
                        {isCurrent ? (
                          <span className={`h-4 w-4 animate-spin rounded-full border-2 ${step.color.replace('text-', 'border-')} border-t-transparent`} />
                        ) : isPast ? (
                          <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <step.icon className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                      <span className={`text-xs font-medium ${
                        isCurrent ? step.color : isPast ? 'text-green-400' : 'text-slate-600'
                      }`}>
                        {step.label}
                      </span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Scanning animation */}
              <div className="mt-6 relative h-1 w-full overflow-hidden rounded-full bg-slate-800/60">
                <motion.div
                  className="absolute inset-y-0 w-32 rounded-full"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)' }}
                />
              </div>
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
