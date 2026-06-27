import { StarField } from '@/components/star-field'
import { Navbar } from '@/components/navbar'
import { HeroSection } from '@/components/sections/hero-section'

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <StarField />
      <Navbar />
      <main className="relative z-10">
        <HeroSection />
      </main>
    </div>
  )
}
