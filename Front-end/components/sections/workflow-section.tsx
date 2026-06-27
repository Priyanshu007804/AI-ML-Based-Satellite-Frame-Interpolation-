'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Upload, Brain, Layers, Cloud, Wind, BarChart3, CheckCircle } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Satellite Frames',
    description: 'Provide two consecutive satellite observation frames (T1 & T2) as PNG or JPG.',
    color: 'cyan',
  },
  {
    icon: Brain,
    number: '02',
    title: 'RIFE Deep Learning Model',
    description: 'PyTorch-powered RIFE model analyzes spatial and temporal features between frames.',
    color: 'purple',
  },
  {
    icon: Layers,
    number: '03',
    title: 'Intermediate Frame Generation',
    description: 'The model synthesizes a high-quality intermediate frame at T=(T1+T2)/2.',
    color: 'blue',
  },
  {
    icon: Cloud,
    number: '04',
    title: 'Cloud Motion Analysis',
    description: 'OpenCV computes per-pixel cloud displacement and generates thermal heatmaps.',
    color: 'cyan',
  },
  {
    icon: Wind,
    number: '05',
    title: 'Optical Flow Estimation',
    description: 'Dense optical flow vectors trace cloud movement trajectories across frames.',
    color: 'purple',
  },
  {
    icon: BarChart3,
    number: '06',
    title: 'Quality Metrics',
    description: 'SSIM, PSNR, and MSE scores validate interpolation quality and accuracy.',
    color: 'blue',
  },
  {
    icon: CheckCircle,
    number: '07',
    title: 'Results Dashboard',
    description: 'View, compare, and download all generated outputs with a comprehensive analysis panel.',
    color: 'green',
  },
]

const colorMap = {
  cyan: { bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', text: 'text-cyan-400', glow: 'shadow-cyan-400/25', line: 'bg-cyan-400/30' },
  purple: { bg: 'bg-purple-400/10', border: 'border-purple-400/30', text: 'text-purple-400', glow: 'shadow-purple-400/25', line: 'bg-purple-400/30' },
  blue: { bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400', glow: 'shadow-blue-400/25', line: 'bg-blue-400/30' },
  green: { bg: 'bg-green-400/10', border: 'border-green-400/30', text: 'text-green-400', glow: 'shadow-green-400/25', line: 'bg-green-400/30' },
}

function WorkflowStep({ step, index }: { step: (typeof steps)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const colors = colorMap[step.color as keyof typeof colorMap]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.6, ease: 'easeOut' }}
      className="relative flex flex-col items-center"
    >
      {/* Connector line */}
      {index < steps.length - 1 && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 hidden lg:block h-px w-full ${colors.line} opacity-50`}
          style={{ left: '60%', width: 'calc(100% - 80px)' }}
          aria-hidden="true"
        />
      )}

      {/* Icon circle */}
      <motion.div
        whileHover={{ scale: 1.08, boxShadow: '0 0 30px rgba(34,211,238,0.3)' }}
        className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border ${colors.bg} ${colors.border} transition-all duration-300`}
      >
        <step.icon className={`h-7 w-7 ${colors.text}`} />
        <div className={`absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-space-900 border ${colors.border}`}>
          <span className={`font-mono text-[9px] font-bold ${colors.text}`}>{step.number}</span>
        </div>
      </motion.div>

      {/* Text */}
      <div className="mt-4 text-center max-w-[160px]">
        <p className={`text-xs font-semibold tracking-wide ${colors.text} mb-1`}>{step.title}</p>
        <p className="text-[11px] leading-relaxed text-slate-500">{step.description}</p>
      </div>
    </motion.div>
  )
}

export function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="workflow" className="relative py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Pipeline</p>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl text-balance">
            Processing Workflow
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm leading-relaxed text-slate-500">
            A seven-stage AI pipeline transforms raw satellite frames into enhanced temporal observations with full quality metrics.
          </p>
        </motion.div>

        {/* Steps — horizontal scroll on desktop, vertical on mobile */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-7">
          {steps.map((step, i) => (
            <WorkflowStep key={step.number} step={step} index={i} />
          ))}
        </div>

        {/* Bottom gradient line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ delay: 0.8, duration: 1.2 }}
          className="mt-16 h-px w-full origin-left"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.4), rgba(139,92,246,0.4), transparent)' }}
        />
      </div>
    </section>
  )
}
