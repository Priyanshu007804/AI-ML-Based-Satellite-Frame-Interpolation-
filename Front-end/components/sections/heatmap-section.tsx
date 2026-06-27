'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import { Download, Thermometer, Wind, Info } from 'lucide-react'

interface VisualizationCardProps {
  title: string
  subtitle: string
  icon: React.ElementType
  iconColor: string
  borderColor: string
  imageData: string | null
  explanation: string
  downloadName: string
  badge: string
  badgeColor: string
  delay?: number
}

function VisualizationCard({
  title, subtitle, icon: Icon, iconColor, borderColor, imageData,
  explanation, downloadName, badge, badgeColor, delay = 0
}: VisualizationCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const handleDownload = () => {
    if (!imageData) return
    const link = document.createElement('a')
    link.href = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`
    link.download = `${downloadName}.png`
    link.click()
  }

  const imgSrc = imageData
    ? imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`
    : null

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6 }}
      className={`glass group rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl ${borderColor}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-700/30">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-opacity-10 ${iconColor.replace('text-', 'border-').replace('400', '400/30')} bg-current/10`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wider ${badgeColor}`}>
          {badge}
        </span>
      </div>

      {/* Image */}
      <div className="relative overflow-hidden bg-slate-900/40" style={{ aspectRatio: '16/9' }}>
        {imgSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
          </>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center">
              <Icon className={`mx-auto h-12 w-12 ${iconColor} opacity-20`} />
              <p className="mt-2 text-xs text-slate-700">Visualization pending</p>
            </div>
          </div>
        )}
      </div>

      {/* Explanation + download */}
      <div className="p-5">
        <div className="flex items-start gap-2 mb-4">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
          <p className="text-xs leading-relaxed text-slate-500">{explanation}</p>
        </div>
        {imgSrc && (
          <button
            onClick={handleDownload}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-2.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-cyan-400/40 hover:bg-cyan-400/8 hover:text-cyan-400"
          >
            <Download className="h-3.5 w-3.5" />
            Download {title}
          </button>
        )}
      </div>
    </motion.div>
  )
}

interface HeatmapSectionProps {
  heatmapData: string | null
  opticalFlowData: string | null
  visible: boolean
}

export function HeatmapSection({ heatmapData, opticalFlowData, visible }: HeatmapSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  if (!visible) return null

  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Visualizations</p>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl text-balance">
            Motion Analysis
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-sm leading-relaxed text-slate-500">
            Cloud displacement patterns derived from deep optical flow estimation and thermal intensity mapping.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <VisualizationCard
            title="Cloud Motion Heatmap"
            subtitle="Thermal displacement intensity map"
            icon={Thermometer}
            iconColor="text-orange-400"
            borderColor="border-orange-400/20 hover:border-orange-400/35"
            imageData={heatmapData}
            explanation="The heatmap encodes cloud displacement intensity — warmer colors (red/orange) indicate high-velocity cloud motion zones, while cooler colors (blue/teal) represent stable or slow-moving regions."
            downloadName="cloud_motion_heatmap"
            badge="HEATMAP"
            badgeColor="border-orange-400/30 bg-orange-400/10 text-orange-400"
            delay={0}
          />
          <VisualizationCard
            title="Optical Flow Visualization"
            subtitle="Dense motion vector field"
            icon={Wind}
            iconColor="text-purple-400"
            borderColor="border-purple-400/20 hover:border-purple-400/35"
            imageData={opticalFlowData}
            explanation="Red vectors represent estimated cloud motion trajectories between consecutive observations. Arrow direction indicates cloud movement direction; arrow length encodes displacement magnitude in pixels."
            downloadName="optical_flow_vectors"
            badge="OPTICAL FLOW"
            badgeColor="border-purple-400/30 bg-purple-400/10 text-purple-400"
            delay={0.15}
          />
        </div>
      </div>
    </section>
  )
}
