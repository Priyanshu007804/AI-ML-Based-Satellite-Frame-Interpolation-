import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Orbitron, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const orbitron = Orbitron({ variable: '--font-orbitron', subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'INTEREP AI — Temporal Resolution Enhancement',
  description: 'AI-Powered Satellite Image Temporal Resolution Enhancement using Deep Learning Frame Interpolation and Optical Flow.',
  generator: 'v0.app',
  keywords: ['satellite', 'AI', 'temporal resolution', 'deep learning', 'optical flow', 'RIFE', 'INTEREP AI'],
  authors: [{ name: 'INTEREP AI Team' }],
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#020818',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${orbitron.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
