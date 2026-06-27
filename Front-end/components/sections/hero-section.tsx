'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Zap, Phone, Play, Mail, ArrowRight } from 'lucide-react'

const slides = [
  {
    title: 'INTEREP AI',
    subtitle: 'Temporal Interpolation',
    description: 'A deep learning framework designed to bridge temporal gaps in satellite observations. Synthesizes high-fidelity intermediate frames for seamless Earth monitoring.',
    buttonText: 'Launch Platform',
    buttonHref: '/upload',
    badgeText: 'Next-Gen Satellite Resolution',
  },
  {
    title: 'Motion Vectors',
    subtitle: 'Optical Flow Engine',
    description: 'Calculates precise sub-pixel displacement vectors between consecutive orbital passes. Tracks movement, clouds, and surface changes with ultra-fine precision.',
    buttonText: 'Explore Motion',
    buttonHref: '/upload#results',
    badgeText: 'Displacement Telemetry',
  },
  {
    title: 'RIFE Pipeline',
    subtitle: 'Neural Frame Synthesis',
    description: 'Leverages Real-Time Intermediate Flow Estimation (RIFE v4.6) adapted for satellite imagery. Generates sharp, artifact-free intermediate observations.',
    buttonText: 'Learn Methodology',
    buttonHref: '/about',
    badgeText: 'Advanced Neural Architecture',
  },
  {
    title: 'Model Telemetry',
    subtitle: 'Evaluation Metrics',
    description: 'Automated analysis comparing PSNR, SSIM, and MSE values. Validates prediction quality and guarantees physical consistency of optical layers.',
    buttonText: 'View Benchmarks',
    buttonHref: '/about',
    badgeText: 'Model Validation Metric',
  },
  {
    title: 'Earth Observation',
    subtitle: 'Multispectral Tracking',
    description: 'Supports a wide variety of satellite sensors and channels. Enhances the temporal resolution of Sentinel, Landsat, and commercial constellations.',
    buttonText: 'Deploy System',
    buttonHref: '/upload',
    badgeText: 'Multi-Constellation Support',
  },
]

export function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0)

  // Broadcast active slide changes to the StarField canvas
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('slide-change', { detail: { index: activeSlide } })
    )
  }, [activeSlide])

  // Optional: auto-play slides every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 8500)
    return () => clearInterval(timer)
  }, [])

  const current = slides[activeSlide]

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Grid background for subtle tech overlay */}
      <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />

      {/* Main container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Content Column (Hero & Slider Controls) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left select-none">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="w-full flex flex-col items-start"
              >
                {/* Overline Badge */}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-widest text-slate-300 uppercase mb-8">
                  <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                  {current.badgeText}
                </span>

                {/* Primary Title */}
                <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
                  {current.title}
                </h1>

                {/* Subtitle / Topic Indicator */}
                <p className="font-heading text-lg sm:text-xl font-medium tracking-widest text-slate-400 uppercase mt-2">
                  {current.subtitle}
                </p>

                {/* Description Paragraph */}
                <p className="mt-6 text-sm sm:text-base leading-relaxed text-slate-400 max-w-xl">
                  {current.description}
                </p>

                {/* Capsule CTA button - Styled exactly like the screenshot's outline buttons */}
                <div className="mt-10">
                  <a
                    href={current.buttonHref}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-transparent px-8 py-3.5 text-xs font-bold tracking-widest text-white uppercase transition-all duration-300 hover:bg-white hover:text-black hover:scale-105 active:scale-95 shadow-lg shadow-white/5 hover:shadow-white/10"
                  >
                    {current.buttonText}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Pagination dots (matching the screenshot) */}
            <div className="flex items-center gap-3 mt-12">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    activeSlide === idx 
                      ? 'bg-white w-6' 
                      : 'bg-white/20 hover:bg-white/50 w-2.5'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Social/Contact Icons in bottom-left */}
            <div className="flex items-center gap-5 mt-16 text-slate-500">
              <a
                href="tel:#"
                aria-label="Phone system"
                className="transition-colors duration-200 hover:text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Play demo"
                className="transition-colors duration-200 hover:text-white"
              >
                <Play className="h-4 w-4" />
              </a>
              <a
                href="mailto:contact@interep.ai"
                aria-label="Email support"
                className="transition-colors duration-200 hover:text-white"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>

          </div>

          {/* Right Column: Kept empty for the canvas planet glow to occupy */}
          <div className="hidden lg:block lg:col-span-5 h-[400px] pointer-events-none" />

        </div>
      </div>

      {/* Telemetry cosmetic index number (bottom-right matching screenshot) */}
      <div className="absolute bottom-10 right-10 font-mono text-xs tracking-widest text-slate-700 select-none">
        50
      </div>
    </section>
  )
}
