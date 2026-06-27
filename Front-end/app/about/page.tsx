'use client'

import { motion } from 'framer-motion'
import { StarField } from '@/components/star-field'
import { Navbar } from '@/components/navbar'
import { WorkflowSection } from '@/components/sections/workflow-section'
import { AboutSection } from '@/components/sections/about-section'
import { Footer } from '@/components/footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <StarField />
      <Navbar />

      <main className="relative z-10 pt-24">
        {/* Page header */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-start gap-6"
            >
              <Link
                href="/"
                className="group flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/40 px-4 py-2 text-xs font-medium tracking-widest text-slate-400 transition-all hover:border-cyan-400/40 hover:text-cyan-400 uppercase"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                Back to App
              </Link>

              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Documentation</p>
                <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl text-balance glow-text-cyan">
                  About INTEREP AI
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
                  Learn how the AI pipeline works, the methodology behind temporal frame interpolation,
                  and the technology stack powering the satellite frame interpolation platform.
                </p>
              </div>

              {/* Divider */}
              <div
                className="w-full h-px"
                style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.4), rgba(139,92,246,0.3), transparent)' }}
              />
            </motion.div>
          </div>
        </section>

        <WorkflowSection />
        <AboutSection />
      </main>

      <Footer />
    </div>
  )
}
