'use client'

import { motion } from 'framer-motion'
import { Satellite, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Upload', href: '/upload' },
  { label: 'Batch', href: '/batch' },
  { label: 'About', href: '/about' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [time, setTime] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toUTCString().replace('GMT', 'UTC'))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass-strong shadow-lg shadow-cyan-400/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
              <Satellite className="h-5 w-5 text-cyan-400" />
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
              </span>
            </div>
            <div>
              <p className="font-heading text-sm font-bold tracking-widest text-cyan-400 glow-text-cyan">
                INTEREP AI
              </p>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase">
                AI Platform
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ label, href }) => {
              const base = href.split('#')[0]
              const isActive = base === '/' ? pathname === '/' : pathname.startsWith(base)
              return (
                <Link
                  key={label}
                  href={href}
                  className={`text-xs font-medium tracking-widest uppercase transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Time display */}
          <div className="hidden md:flex items-center gap-4">
            {time && (
              <span className="font-mono text-[10px] text-slate-500 tracking-wider mr-2 select-none">
                {time}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}
