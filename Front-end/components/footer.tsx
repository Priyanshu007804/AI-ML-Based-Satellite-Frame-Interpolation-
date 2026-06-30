'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Satellite, Code2, ExternalLink, Users, Award } from 'lucide-react'

const teamMembers = [
  { name: 'Priyanshu Singha Roy', role: 'Team Lead & Backend Developer' },
  { name: 'Soumyajit Paul', role: 'ML Engineer' },
  { name: 'Sampad Barik', role: 'Next.js / UI' },
  { name: 'Trisha Jana', role: 'Optical Flow' },
]

export function Footer() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <footer className="relative border-t border-cyan-400/10 py-16 px-4 sm:px-6">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 gap-10 md:grid-cols-3"
        >
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
                <Satellite className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-heading text-sm font-bold tracking-widest text-cyan-400">INTEREP AI</p>
                <p className="text-[10px] text-slate-600 tracking-widest uppercase">AI Platform</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 max-w-[260px]">
              AI-powered satellite image temporal resolution enhancement using deep learning frame interpolation and optical flow estimation.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/40 text-slate-500 transition-all hover:border-cyan-400/40 hover:text-cyan-400"
              >
                <Code2 className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Team */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Users className="h-4 w-4 text-cyan-400/60" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Team</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {teamMembers.map((member) => (
                <div key={member.name} className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-3">
                  <p className="text-xs font-medium text-slate-300">{member.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{member.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Project Details */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Award className="h-4 w-4 text-cyan-400/60" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Project</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Platform', value: 'INTEREP AI' },
                { label: 'Version', value: '1.0.0' },
                { label: 'Application', value: 'Earth Observation' },
                { label: 'Focus', value: 'Temporal Interpolation' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-[11px] text-slate-600">{label}</span>
                  <span className="text-[11px] font-medium text-slate-400">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800/60 pt-6 sm:flex-row"
        >
          <p className="text-xs text-slate-700">
            &copy; 2025 INTEREP AI Team
          </p>
          <p className="text-xs text-slate-700">
            Built with Next.js · PyTorch · RIFE · OpenCV
          </p>
        </motion.div>
      </div>
    </footer>
  )
}
