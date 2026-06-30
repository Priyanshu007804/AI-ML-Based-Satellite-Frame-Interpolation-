'use client'

import React, { Suspense, useRef, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EarthModel } from '@/components/earth-model'
import { SpaceEnvironment } from '@/components/space-environment'
import { slides } from '@/data/slides'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ─── Types ─────────────────────────────────────────────────────────────

interface CameraWaypoint {
  position: [number, number, number]
  target: [number, number, number]
  rotationSpeed: number
}

// ─── Camera waypoints per section ──────────────────────────────────────

const WAYPOINTS: CameraWaypoint[] = [
  // 🌍 Hero - Entire Earth
  {
    position: [0, 0, 8],
    target: [0, 0, 0],
    rotationSpeed: 0.0008,
  },

  // 🌎 South America fly-in
  {
    position: [3.8, 1.4, 3.2],
    target: [0.8, 0.3, 0],
    rotationSpeed: 0.0025,
  },

  // 🌍 Africa cinematic orbit
  {
    position: [-4.2, 1.8, 3.5],
    target: [-0.7, 0.2, 0],
    rotationSpeed: 0.002,
  },

  // ❄ Polar view
  {
    position: [0, 6.5, 1.8],
    target: [0, 0, 0],
    rotationSpeed: 0.0015,
  },

  // 🌏 Asia pull-back ending
  {
    position: [2.8, -2.2, 6.5],
    target: [0, 0, 0],
    rotationSpeed: 0.001,
  },
]
// ─── Error Boundary ────────────────────────────────────────────────────

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/20 text-red-500 font-mono p-8">
          <div>
            <h2 className="text-xl font-bold mb-4">Canvas Error</h2>
            <pre className="text-sm bg-black p-4 rounded">{this.state.error?.message}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── CameraRig — reads scroll progress and interpolates camera ─────────

interface CameraRigProps {
  progressRef: React.MutableRefObject<{ value: number }>
}

function CameraRig({ progressRef }: CameraRigProps) {
  const { camera } = useThree()
  const currentPos = useRef(new THREE.Vector3(...WAYPOINTS[0].position))
  const currentTarget = useRef(new THREE.Vector3(...WAYPOINTS[0].target))

  useFrame(() => {
    const t = progressRef.current.value
    const totalSegments = WAYPOINTS.length - 1
    const rawIndex = t * totalSegments
    const segIndex = Math.min(Math.floor(rawIndex), totalSegments - 1)
    const segT = rawIndex - segIndex

    const from = WAYPOINTS[segIndex]
    const to = WAYPOINTS[Math.min(segIndex + 1, totalSegments)]

    // Smooth easing - using Sine for a more cinematic transition
    const eased = -(Math.cos(Math.PI * segT) - 1) / 2

    const targetPos = new THREE.Vector3(
      THREE.MathUtils.lerp(from.position[0], to.position[0], eased),
      THREE.MathUtils.lerp(from.position[1], to.position[1], eased),
      THREE.MathUtils.lerp(from.position[2], to.position[2], eased)
    )

    const targetLookAt = new THREE.Vector3(
      THREE.MathUtils.lerp(from.target[0], to.target[0], eased),
      THREE.MathUtils.lerp(from.target[1], to.target[1], eased),
      THREE.MathUtils.lerp(from.target[2], to.target[2], eased)
    )

    // Smooth interpolation (lower factor for more inertia/weight)
    currentPos.current.lerp(targetPos, 0.03)
    currentTarget.current.lerp(targetLookAt, 0.03)

    camera.position.copy(currentPos.current)
    camera.lookAt(currentTarget.current)
  })

  return null
}

// ─── EarthRotator — wraps EarthModel with scroll-driven rotation ────────

interface EarthRotatorProps {
  progressRef: React.MutableRefObject<{ value: number }>
}

function EarthRotator({ progressRef }: EarthRotatorProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const t = progressRef.current.value
    const totalSegments = WAYPOINTS.length - 1
    const rawIndex = t * totalSegments
    const segIndex = Math.min(Math.floor(rawIndex), totalSegments - 1)
    const segT = rawIndex - segIndex

    const from = WAYPOINTS[segIndex]
    const to = WAYPOINTS[Math.min(segIndex + 1, totalSegments)]
    const eased = -(Math.cos(Math.PI * segT) - 1) / 2
    const targetSpeed = THREE.MathUtils.lerp(from.rotationSpeed, to.rotationSpeed, eased)

    // Apply rotation with delta-time smoothing
    groupRef.current.rotation.y += targetSpeed + delta * 0.05
  })

  return (
    <group ref={groupRef}>
      <EarthModel />
    </group>
  )
}

// ─── EarthScene — the full 3D scene composition ────────────────────────

interface EarthSceneProps {
  progressRef: React.MutableRefObject<{ value: number }>
}

function EarthScene({ progressRef }: EarthSceneProps) {
  return (
    <>
      {/* Lighting — matching the original working setup */}
      <ambientLight intensity={2} />
      <directionalLight position={[5, 5, 5]} intensity={3} color="#ffffff" />

      {/* Subtle rim light for cinematic feel */}
      <directionalLight position={[-5, -2, -5]} intensity={0.6} color="#1a3a6e" />
      <pointLight position={[3, 2, 4]} intensity={0.4} color="#22d3ee" distance={12} />

      {/* Space background */}
      <SpaceEnvironment />

      {/* Camera controller */}
      <CameraRig progressRef={progressRef} />

      {/* Earth with scroll-driven rotation */}
      <Suspense fallback={
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#0a1628" wireframe />
        </mesh>
      }>
        <EarthRotator progressRef={progressRef} />
      </Suspense>
    </>
  )
}

// ─── ScrollPanel — individual text overlay for each section ────────────

interface ScrollPanelProps {
  slide: typeof slides[0]
  index: number
  isFirst: boolean
  isLast: boolean
}

function ScrollPanel({ slide, index, isFirst }: ScrollPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: panelRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
          // Don't animate the first panel on entry — it should be visible
        },
      })

      if (!isFirst) {
        // Animate content in
        gsap.fromTo(
          contentRef.current!.querySelectorAll('.anim-element'),
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.08,
            scrollTrigger: {
              trigger: panelRef.current,
              start: 'top 70%',
              end: 'top 30%',
              scrub: 1,
            },
          }
        )
      }

      // Fade out as we leave
      tl.to(contentRef.current!.querySelectorAll('.anim-element'), {
        opacity: 0,
        y: -30,
        stagger: 0.04,
      })
    }, panelRef)

    return () => ctx.revert()
  }, [isFirst])

  const accentColors = [
    'text-cyan-400 border-cyan-400/20 bg-cyan-400/5',
    'text-purple-400 border-purple-400/20 bg-purple-400/5',
    'text-orange-400 border-orange-400/20 bg-orange-400/5',
    'text-green-400 border-green-400/20 bg-green-400/5',
    'text-sky-400 border-sky-400/20 bg-sky-400/5',
  ]

  const titleGradients = [
    'from-blue-600 via-indigo-500 to-purple-800',
    'from-fuchsia-600 via-purple-500 to-indigo-800',
    'from-rose-600 via-red-500 to-orange-800',
    'from-teal-600 via-emerald-500 to-green-800',
    'from-blue-600 via-cyan-500 to-indigo-800',
  ]

  const textGradients = [
    'from-blue-200 to-indigo-400',
    'from-fuchsia-200 to-purple-400',
    'from-rose-200 to-red-400',
    'from-teal-200 to-emerald-400',
    'from-cyan-200 to-blue-400',
  ]

  const badgeAccent = accentColors[index % accentColors.length]
  const titleGlows: React.CSSProperties[] = [
    { textShadow: '0 2px 20px rgba(79,70,229,0.5)' },
    { textShadow: '0 2px 20px rgba(147,51,234,0.5)' },
    { textShadow: '0 2px 20px rgba(225,29,72,0.5)' },
    { textShadow: '0 2px 20px rgba(16,185,129,0.5)' },
    { textShadow: '0 2px 20px rgba(6,182,212,0.5)' },
  ]

  return (
    <div
      ref={panelRef}
      className="scroll-panel relative flex items-center"
      style={{ height: '100vh' }}
    >
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12">
        <div
          ref={contentRef}
          className="max-w-xl"
        >
          {/* Badge */}
          <span
            className={`anim-element inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase mb-6 ${badgeAccent}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {slide.badgeText}
          </span>

          {/* Title */}
          <h2
            className={`anim-element font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] bg-gradient-to-br bg-clip-text text-transparent pb-2 drop-shadow-2xl ${titleGradients[index % titleGradients.length]}`}
            style={titleGlows[index % titleGlows.length]}
          >
            {slide.title}
          </h2>

          {/* Subtitle */}
          <p className={`anim-element font-heading text-base sm:text-lg font-bold tracking-[0.25em] uppercase mt-3 bg-gradient-to-r bg-clip-text text-transparent drop-shadow-lg ${textGradients[index % textGradients.length]}`}>
            {slide.subtitle}
          </p>

          {/* Divider line */}
          <div className="anim-element h-1 w-16 bg-gradient-to-r from-current to-transparent mt-6 mb-6 opacity-80 rounded-full" style={{ color: badgeAccent.includes('cyan') ? '#0891b2' : badgeAccent.includes('purple') ? '#9333ea' : badgeAccent.includes('orange') ? '#ea580c' : badgeAccent.includes('green') ? '#16a34a' : '#0284c7' }} />

          {/* Description */}
          <p className={`anim-element text-sm sm:text-base leading-relaxed font-medium bg-gradient-to-br bg-clip-text text-transparent drop-shadow-lg max-w-lg ${textGradients[index % textGradients.length]}`}>
            {slide.description}
          </p>

          {/* CTA */}
          <div className="anim-element mt-8">
            <a
              href={slide.buttonHref}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/60 bg-transparent px-7 py-3 text-[11px] font-bold tracking-[0.2em] text-white uppercase transition-all duration-300 hover:bg-white hover:text-black hover:scale-105 active:scale-95"
            >
              {slide.buttonText}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>

          {/* Section index indicator */}
          <div className="anim-element flex items-center gap-3 mt-12">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === index
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/15'
                }`}
              />
            ))}
            <span className="ml-3 font-mono text-[10px] text-slate-600 tracking-widest">
              {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Desktop Scroll Hero ──────────────────────────────────────────

export function DesktopScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollProgressRef = useRef({ value: 0 })

  // Set up master ScrollTrigger that maps scroll → progress [0, 1]
  useEffect(() => {
    if (!containerRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate: (self) => {
          scrollProgressRef.current.value = self.progress
        },
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {/* Fixed fullscreen R3F Canvas — stays behind scroll content */}
      <div className="fixed inset-0 z-0">
        <CanvasErrorBoundary>
          <Canvas
            camera={{ position: [0, 0, 4.5], fov: 45, near: 0.1, far: 100 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            }}
            style={{ background: '#030816' }}
            dpr={[1, 1.5]}
          >
            <EarthScene progressRef={scrollProgressRef} />
          </Canvas>
        </CanvasErrorBoundary>
      </div>

      {/* Scroll content — HTML panels on top of the canvas */}
      <div className="relative z-10">
        {slides.map((slide, index) => (
          <ScrollPanel
            key={index}
            slide={slide}
            index={index}
            isFirst={index === 0}
            isLast={index === slides.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
