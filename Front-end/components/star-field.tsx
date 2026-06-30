'use client'

import { useEffect, useRef } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  speed: number
  layer: number // 0: background, 1: middle, 2: foreground
}

interface Crater {
  x: number
  y: number
  r: number
  opacity: number
}

const slideColors = [
  { r: 34, g: 211, b: 238 },   // Slide 0: Cyan (#22d3ee)
  { r: 139, g: 92, b: 246 },   // Slide 1: Purple (#8b5cf6)
  { r: 251, g: 146, b: 60 },   // Slide 2: Gold/Orange (#fb923c)
  { r: 74, g: 222, b: 128 },   // Slide 3: Green/Emerald (#4ade80)
  { r: 56, g: 189, b: 248 },   // Slide 4: Electric Blue (#38bdf8)
]

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  
  // Track normalized mouse coords (-0.5 to 0.5)
  const mouseRef = useRef({ x: 0, y: 0, currentX: 0, currentY: 0 })
  // Track active slide color interpolation
  const colorRef = useRef({ r: 34, g: 211, b: 238, targetR: 34, targetG: 211, targetB: 238 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set dimensions
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Capture mouse move
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) - 0.5
      mouseRef.current.y = (e.clientY / window.innerHeight) - 0.5
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Listen to custom slide-change events from the HeroSection
    const handleSlideChange = (e: Event) => {
      const customEvent = e as CustomEvent
      const index = customEvent.detail?.index ?? 0
      const color = slideColors[index % slideColors.length]
      if (color) {
        colorRef.current.targetR = color.r
        colorRef.current.targetG = color.g
        colorRef.current.targetB = color.b
      }
    }
    window.addEventListener('slide-change', handleSlideChange)

    // Generate stars across 3 parallax layers
    const starsCount = 180
    const stars: Star[] = Array.from({ length: starsCount }, () => {
      const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.85 ? 1 : 2
      let size = 0.5
      let opacity = 0.3
      let speed = 0.02

      if (layer === 0) {
        size = Math.random() * 0.7 + 0.3
        opacity = Math.random() * 0.4 + 0.15
        speed = Math.random() * 0.02 + 0.01
      } else if (layer === 1) {
        size = Math.random() * 0.9 + 0.7
        opacity = Math.random() * 0.5 + 0.35
        speed = Math.random() * 0.05 + 0.03
      } else {
        size = Math.random() * 1.2 + 1.2
        opacity = Math.random() * 0.4 + 0.5
        speed = Math.random() * 0.09 + 0.06
      }

      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size,
        opacity,
        speed,
        layer,
      }
    })

    // Generate static planet craters (relative offsets)
    const craters: Crater[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * 1.2 - 0.6,
      y: Math.random() * 1.2 - 0.6,
      r: Math.random() * 0.14 + 0.04,
      opacity: Math.random() * 0.04 + 0.02,
    }))

    let animId: number
    const animate = () => {
      // Smoothly interpolate mouse coords (inertia)
      const mouse = mouseRef.current
      mouse.currentX += (mouse.x - mouse.currentX) * 0.05
      mouse.currentY += (mouse.y - mouse.currentY) * 0.05

      // Smoothly interpolate colors
      const color = colorRef.current
      color.r += (color.targetR - color.r) * 0.06
      color.g += (color.targetG - color.g) * 0.06
      color.b += (color.targetB - color.b) * 0.06

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Solid background shade
      ctx.fillStyle = '#030816'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw background space stars with parallax offsets
      stars.forEach((star) => {
        // Star movement drift
        star.y += star.speed
        if (star.y > canvas.height) {
          star.y = 0
          star.x = Math.random() * canvas.width
        }

        // Parallax multipliers per layer
        const multiplier = star.layer === 0 ? 8 : star.layer === 1 ? 22 : 45
        let drawX = (star.x + mouse.currentX * multiplier) % canvas.width
        let drawY = (star.y + mouse.currentY * multiplier) % canvas.height
        if (drawX < 0) drawX += canvas.width
        if (drawY < 0) drawY += canvas.height

        // Twinkle effect
        star.opacity += (Math.random() - 0.5) * 0.015
        star.opacity = Math.max(0.1, Math.min(0.9, star.opacity))

        ctx.beginPath()
        ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(226, 232, 240, ${star.opacity})`
        ctx.fill()

        // Subtle electric blue/cyan glow on foreground stars
        if (star.layer === 2 && star.size > 1.8) {
          const glow = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, star.size * 3.5)
          glow.addColorStop(0, `rgba(34, 211, 238, ${star.opacity * 0.25})`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(drawX, drawY, star.size * 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Skip drawing planet if we are on desktop where the 3D model takes over
      if (!isDesktop) {
        // Establish Planet coordinates (bottom-right)
        const isMobile = canvas.width < 768
      const planetX = isMobile ? canvas.width * 0.95 : canvas.width * 0.88
      const planetY = isMobile ? canvas.height * 0.92 : canvas.height * 0.82
      const planetRadius = isMobile ? canvas.width * 0.35 : Math.min(canvas.width * 0.28, 420)

      // Parallax shifts planet and nebula in the OPPOSITE direction of mouse
      const planetParallaxX = -mouse.currentX * 18
      const planetParallaxY = -mouse.currentY * 18
      const finalPlanetX = planetX + planetParallaxX
      const finalPlanetY = planetY + planetParallaxY

      // Light source (behind the top-left curve of the planet)
      const lightOffsetX = -planetRadius * 0.5
      const lightOffsetY = -planetRadius * 0.5
      const finalLightX = finalPlanetX + lightOffsetX
      const finalLightY = finalPlanetY + lightOffsetY

      // 1. Draw Nebula / Sun Glow behind the planet (drawn first)
      const sunGlow = ctx.createRadialGradient(finalLightX, finalLightY, 0, finalLightX, finalLightY, planetRadius * 2.8)
      // Base glowing colors matching the screenshot's soft warm yellowish nebula
      sunGlow.addColorStop(0, 'rgba(255, 236, 195, 0.26)') // inner hot spot
      sunGlow.addColorStop(0.2, `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.12)`) // active slide color blend
      sunGlow.addColorStop(0.5, 'rgba(15, 32, 67, 0.04)') // deep space blend
      sunGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = sunGlow
      ctx.beginPath()
      ctx.arc(finalLightX, finalLightY, planetRadius * 2.8, 0, Math.PI * 2)
      ctx.fill()

      // 2. Draw Outer Atmosphere Halo around the planet rim
      const haloGlow = ctx.createRadialGradient(finalLightX, finalLightY, planetRadius * 0.96, finalLightX, finalLightY, planetRadius * 1.06)
      haloGlow.addColorStop(0, 'rgba(255, 236, 195, 0.32)')
      haloGlow.addColorStop(0.3, `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.2)`)
      haloGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = haloGlow
      ctx.beginPath()
      ctx.arc(finalPlanetX, finalPlanetY, planetRadius * 1.06, 0, Math.PI * 2)
      ctx.fill()

      // 3. Draw Planet Sphere (clipped region for surface & shading)
      ctx.save()
      ctx.beginPath()
      ctx.arc(finalPlanetX, finalPlanetY, planetRadius, 0, Math.PI * 2)
      ctx.clip()

      // Base planet body
      ctx.fillStyle = '#060b15'
      ctx.fillRect(finalPlanetX - planetRadius, finalPlanetY - planetRadius, planetRadius * 2, planetRadius * 2)

      // Draw craters
      ctx.fillStyle = 'rgba(255, 255, 255, 0.012)'
      craters.forEach((crater) => {
        ctx.beginPath()
        const cx = finalPlanetX + crater.x * planetRadius
        const cy = finalPlanetY + crater.y * planetRadius
        const cr = crater.r * planetRadius
        ctx.arc(cx, cy, cr, 0, Math.PI * 2)
        ctx.fill()

        // Crater shade
        ctx.beginPath()
        ctx.arc(cx + cr * 0.12, cy + cr * 0.12, cr * 0.95, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'
        ctx.fill()
      })

      // Draw the crescent backlight shading overlay
      // Radial gradient centered at the light source that maps to the planet's diameter
      const planetShading = ctx.createRadialGradient(finalLightX, finalLightY, planetRadius * 0.5, finalLightX, finalLightY, planetRadius * 1.95)
      planetShading.addColorStop(0, 'rgba(255, 240, 210, 0.45)') // lit rim
      planetShading.addColorStop(0.12, `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.16)`) // active slide glow wrap
      planetShading.addColorStop(0.35, 'rgba(4, 9, 21, 0.94)') // shadow line
      planetShading.addColorStop(1, 'rgba(2, 4, 10, 1)') // deep shadowed side
      ctx.fillStyle = planetShading
      ctx.beginPath()
      ctx.arc(finalPlanetX, finalPlanetY, planetRadius, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
      }

      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('slide-change', handleSlideChange)
    }
  }, [isDesktop])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 lg:hidden"
      aria-hidden="true"
    />
  )
}
