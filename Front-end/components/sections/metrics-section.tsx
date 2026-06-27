'use client'

import { motion, useInView, AnimatePresence, useMotionValue, useSpring, useEffect as useMotionEffect } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'

interface MetricsData {
  ssim: number
  psnr: number
  mse: number
  fsim: number
}

interface MetricCardProps {
  label: string
  value: number
  unit: string
  description: string
  interpretation: string
  quality: 'good' | 'average' | 'poor'
  min: number
  max: number
  higherIsBetter: boolean
  index: number
}

function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = 0
    const end = value
    const duration = 1400
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + (end - start) * eased)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return <>{display.toFixed(decimals)}</>
}

function MetricCard({ label, value, unit, description, interpretation, quality, min, max, higherIsBetter, index }: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const displayPct = higherIsBetter ? pct : 100 - pct

  const qualityColors = {
    good: { text: 'text-green-400', bg: 'bg-green-400', border: 'border-green-400/30', badge: 'border-green-400/30 bg-green-400/10 text-green-400' },
    average: { text: 'text-cyan-400', bg: 'bg-cyan-400', border: 'border-cyan-400/30', badge: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400' },
    poor: { text: 'text-orange-400', bg: 'bg-orange-400', border: 'border-orange-400/30', badge: 'border-orange-400/30 bg-orange-400/10 text-orange-400' },
  }
  const colors = qualityColors[quality]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      className={`glass group rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg ${colors.border}`}
    >
      {/* Label + badge */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-heading text-xs font-bold tracking-widest text-slate-400 uppercase">{label}</p>
          <p className="mt-1 text-xs text-slate-600 leading-snug max-w-[180px]">{description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wider ${colors.badge}`}>
          {interpretation}
        </span>
      </div>

      {/* Value */}
      <div className="mb-5 flex items-end gap-1">
        <span className={`font-heading text-4xl font-bold ${colors.text}`}>
          {inView ? <AnimatedNumber value={value} decimals={label === 'MSE' ? 4 : 2} /> : '0.00'}
        </span>
        {unit && <span className="mb-1 text-sm text-slate-500">{unit}</span>}
        {higherIsBetter
          ? <TrendingUp className={`mb-1 ml-2 h-4 w-4 ${colors.text}`} />
          : <TrendingDown className={`mb-1 ml-2 h-4 w-4 ${colors.text}`} />
        }
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Quality Score</span>
          <span className={colors.text}>{displayPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
          <motion.div
            className={`h-full rounded-full ${colors.bg}`}
            initial={{ width: '0%' }}
            animate={inView ? { width: `${displayPct}%` } : { width: '0%' }}
            transition={{ delay: index * 0.15 + 0.4, duration: 1, ease: 'easeOut' }}
            style={{ boxShadow: quality === 'good' ? '0 0 8px rgba(74,222,128,0.4)' : '0 0 8px rgba(34,211,238,0.3)' }}
          />
        </div>
      </div>
    </motion.div>
  )
}

interface MetricsSectionProps {
  metrics: MetricsData | null
  visible: boolean
}

export function MetricsSection({ metrics, visible }: MetricsSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  if (!metrics || !visible) return null

  const cards: Omit<MetricCardProps, 'index'>[] = [
    {
      label: 'SSIM',
      value: metrics.ssim,
      unit: '',
      description: 'Structural Similarity Index — measures perceptual quality',
      interpretation: metrics.ssim >= 0.8 ? 'Excellent' : metrics.ssim >= 0.6 ? 'Good' : 'Fair',
      quality: metrics.ssim >= 0.8 ? 'good' : metrics.ssim >= 0.6 ? 'average' : 'poor',
      min: 0,
      max: 1,
      higherIsBetter: true,
    },
    {
      label: 'PSNR',
      value: metrics.psnr,
      unit: 'dB',
      description: 'Peak Signal-to-Noise Ratio — measures reconstruction fidelity',
      interpretation: metrics.psnr >= 30 ? 'High Quality' : metrics.psnr >= 25 ? 'Acceptable' : 'Low Quality',
      quality: metrics.psnr >= 30 ? 'good' : metrics.psnr >= 25 ? 'average' : 'poor',
      min: 15,
      max: 50,
      higherIsBetter: true,
    },
    {
      label: 'MSE',
      value: metrics.mse,
      unit: '',
      description: 'Mean Squared Error — measures pixel-level reconstruction error',
      interpretation: metrics.mse <= 0.005 ? 'Very Low Error' : metrics.mse <= 0.02 ? 'Low Error' : 'Moderate Error',
      quality: metrics.mse <= 0.005 ? 'good' : metrics.mse <= 0.02 ? 'average' : 'poor',
      min: 0,
      max: 0.1,
      higherIsBetter: false,
    },
    {
      label: 'FSIM',
      value: metrics.fsim,
      unit: '',
      description: 'Feature Similarity Index — captures cloud motion features',
      interpretation: metrics.fsim >= 0.85 ? 'Excellent' : metrics.fsim >= 0.7 ? 'Good' : 'Fair',
      quality: metrics.fsim >= 0.85 ? 'good' : metrics.fsim >= 0.7 ? 'average' : 'poor',
      min: 0,
      max: 1,
      higherIsBetter: true,
    },
  ]

  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Quality Assessment</p>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl text-balance">
            Performance Metrics
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-sm leading-relaxed text-slate-500">
            Quantitative evaluation of the generated frame against reference observations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {cards.map((card, i) => (
            <MetricCard key={card.label} {...card} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
