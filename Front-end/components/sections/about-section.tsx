'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Target, FlaskConical, Cpu, GitBranch } from 'lucide-react'

const cards = [
  {
    icon: Target,
    color: 'cyan',
    title: 'Objective',
    content: 'Bridge the temporal gaps in satellite observation data using AI. Standard geostationary satellites provide images every 15–60 minutes, leaving critical periods unobserved during rapid weather events such as cyclone formation and flash floods.',
  },
  {
    icon: FlaskConical,
    color: 'purple',
    title: 'Methodology',
    content: 'RIFE (Real-Time Intermediate Flow Estimation) deep learning model generates synthetic intermediate frames. Dense optical flow via Farneback algorithm tracks cloud displacement. Quality is validated using SSIM, PSNR, and MSE metrics.',
  },
  {
    icon: Cpu,
    color: 'blue',
    title: 'Tech Stack',
    content: 'Frontend: Next.js 16, TypeScript, Tailwind CSS, Framer Motion, TanStack Query. Backend: FastAPI (Python), PyTorch, RIFE v4.6, OpenCV, NumPy. Deployment: Vercel (frontend), Docker (backend).',
  },
  {
    icon: GitBranch,
    color: 'green',
    title: 'Architecture',
    content: 'Decoupled frontend-backend REST architecture. Frontend sends multipart form data to /predict endpoint. FastAPI processes frames through the RIFE pipeline and returns base64-encoded images with quality metrics as JSON.',
  },
]

const colorMap = {
  cyan: { icon: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/8', hover: 'hover:border-cyan-400/40', number: 'text-cyan-400/30' },
  purple: { icon: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/8', hover: 'hover:border-purple-400/40', number: 'text-purple-400/30' },
  blue: { icon: 'text-blue-400', border: 'border-blue-400/20', bg: 'bg-blue-400/8', hover: 'hover:border-blue-400/40', number: 'text-blue-400/30' },
  green: { icon: 'text-green-400', border: 'border-green-400/20', bg: 'bg-green-400/8', hover: 'hover:border-green-400/40', number: 'text-green-400/30' },
}

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="about" className="relative py-24 px-4 sm:px-6">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Project</p>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl text-balance">
            About the Project
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm leading-relaxed text-slate-500">
            An open-source deep learning solution for improving satellite image temporal resolution.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {cards.map((card, i) => {
            const colors = colorMap[card.color as keyof typeof colorMap]
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                className={`glass group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${colors.border} ${colors.hover}`}
              >
                {/* Background number */}
                <span className={`absolute -right-3 -top-4 font-heading text-8xl font-black ${colors.number} select-none pointer-events-none`}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="relative">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${colors.border} ${colors.bg}`}>
                    <card.icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <h3 className="mb-3 text-base font-semibold text-slate-200">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{card.content}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
