import { StarField } from '@/components/star-field'
import { Navbar } from '@/components/navbar'
import { HeroSection } from '@/components/sections/hero-section'

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* 2D StarField — only visible on mobile (has lg:hidden built in) */}
      <StarField />
      {/* Cinematic vignette overlay for desktop 3D scene */}
      <div className="scroll-vignette hidden lg:block" />
      <Navbar />
      <main className="relative z-10">
        <HeroSection />
      </main>
    </div>
  )
}
