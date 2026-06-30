'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import {
  CheckCircle, CloudRain, TrendingUp, Layers, Download, FileImage, Thermometer, Wind
} from 'lucide-react'
import { getOutputUrl } from '@/lib/api'

interface MetricsData {
  ssim: number
  psnr: number
  mse: number
  fsim: number
}

const getInterpolationQuality = (metrics: MetricsData): string => {
  const score = (metrics.ssim >= 0.8 ? 3 : metrics.ssim >= 0.6 ? 2 : 1) +
    (metrics.psnr >= 30 ? 3 : metrics.psnr >= 25 ? 2 : 1) +
    (metrics.mse <= 0.005 ? 3 : metrics.mse <= 0.02 ? 2 : 1)
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Moderate'
  return 'Low'
}

const qualityColors = {
  Excellent: 'text-green-400 border-green-400/30 bg-green-400/10',
  High: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  Moderate: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  Low: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
}

interface AnalysisSectionProps {
  metrics: MetricsData | null
  generatedImage: string | null
  heatmapData: string | null
  opticalFlowData: string | null
  visible: boolean
}

export function AnalysisSection({
  metrics, generatedImage, heatmapData, opticalFlowData, visible
}: AnalysisSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  if (!visible || !metrics) return null

  const quality = getInterpolationQuality(metrics)
  const qualityColor = qualityColors[quality as keyof typeof qualityColors]

  const analysisItems = [
    { icon: CheckCircle, label: 'Prediction Successful', detail: 'RIFE model completed without errors', color: 'text-green-400 border-green-400/25 bg-green-400/8' },
    { icon: CloudRain, label: 'Cloud Motion Detected', detail: 'Optical flow vectors computed across frame', color: 'text-cyan-400 border-cyan-400/25 bg-cyan-400/8' },
    { icon: TrendingUp, label: 'Temporal Resolution Improved', detail: '2× observation frequency achieved', color: 'text-purple-400 border-purple-400/25 bg-purple-400/8' },
    { icon: Layers, label: `Interpolation Quality: ${quality}`, detail: `SSIM ${metrics.ssim.toFixed(3)} · PSNR ${metrics.psnr.toFixed(2)} dB · MSE ${metrics.mse.toFixed(4)}`, color: `${qualityColor} border-current` },
  ]

  const downloadItems = [
    { label: 'Generated Frame', icon: FileImage, data: generatedImage, filename: 'generated_frame.png', color: 'hover:border-cyan-400/40 hover:text-cyan-400' },
    { label: 'Cloud Heatmap', icon: Thermometer, data: heatmapData, filename: 'cloud_heatmap.png', color: 'hover:border-orange-400/40 hover:text-orange-400' },
    { label: 'Optical Flow', icon: Wind, data: opticalFlowData, filename: 'optical_flow.png', color: 'hover:border-purple-400/40 hover:text-purple-400' },
  ]

  const handleDownload = (data: string | null, filename: string) => {
    if (!data) return
    const link = document.createElement('a')
    link.href = getOutputUrl(data)
    link.download = filename
    link.click()
  }

  const handleDownloadAll = () => {
    downloadItems.forEach(({ data, filename }) => {
      if (data) {
        setTimeout(() => handleDownload(data, filename), 200)
      }
    })
  }

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
          <p className="text-xs uppercase tracking-widest text-cyan-400 mb-3">Summary</p>
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl text-balance">
            Analysis Report
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Analysis panel */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="lg:col-span-3 glass rounded-2xl p-6 border border-cyan-400/15"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
                <CheckCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Prediction Analysis</h3>
                <p className="text-xs text-slate-500">Automated quality assessment report</p>
              </div>
              <span className={`ml-auto rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wider ${qualityColor}`}>
                {quality} Quality
              </span>
            </div>

            <div className="space-y-3">
              {analysisItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${item.color}`}
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-[11px] opacity-70">{item.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Download panel */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:col-span-2 glass rounded-2xl p-6 border border-slate-700/40"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600/50 bg-slate-800/50">
                <Download className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Export Outputs</h3>
                <p className="text-xs text-slate-500">Download all generated files</p>
              </div>
            </div>

            <div className="space-y-3">
              {downloadItems.map(({ label, icon: Icon, data, filename, color }, i) => (
                <motion.button
                  key={label}
                  onClick={() => handleDownload(data, filename)}
                  disabled={!data}
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  className={`flex w-full items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3.5 text-left text-sm text-slate-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-xs font-medium">{label}</span>
                  <Download className="h-3.5 w-3.5 opacity-50" />
                </motion.button>
              ))}
            </div>

            {/* Download all */}
            <motion.button
              onClick={handleDownloadAll}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.65, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/8 p-3 text-xs font-semibold text-cyan-400 transition-all duration-200 hover:bg-cyan-400/15 hover:border-cyan-400/50"
            >
              <Download className="h-3.5 w-3.5" />
              Download All Outputs
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
