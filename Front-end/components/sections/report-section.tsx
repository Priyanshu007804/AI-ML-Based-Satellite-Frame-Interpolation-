'use client'

import React, { useState } from 'react'
import { FileDown, ExternalLink, FileText, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { getReportUrl } from '@/lib/api'

interface ReportSectionProps {
  jobId: string
  numOriginal: number
  numInterpolated: number
  avgSsim: number
  avgPsnr: number
  avgMse: number
  avgFsim: number
}

export function ReportSection({
  jobId, numOriginal, numInterpolated, avgSsim, avgPsnr, avgMse, avgFsim
}: ReportSectionProps) {
  const [downloading, setDownloading] = useState(false)
  const reportUrl = getReportUrl(jobId)

  const handleDownload = () => {
    setDownloading(true)
    // Create an invisible anchor to trigger download
    const a = document.createElement('a')
    a.href = reportUrl
    a.download = `interpolation-report-${jobId}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setDownloading(false), 2000)
  }

  return (
    <div className="glass rounded-2xl p-6 border border-cyan-400/15 mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Comprehensive Analysis Report</h3>
          </div>
          <p className="text-sm text-slate-400 max-w-xl">
            A detailed report containing interpolation results, optical flow analysis, cloud motion heatmaps, and frame-by-frame metrics is ready.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 shrink-0">
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View Inline
          </a>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Downloading...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Download Report
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Frames Interpolated</p>
          <p className="text-lg font-medium text-slate-200">{numOriginal} <span className="text-slate-500 text-sm mx-1">→</span> <span className="text-cyan-400">{numInterpolated}</span></p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Avg SSIM</p>
          <p className="text-lg font-medium text-green-400">{avgSsim.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Avg PSNR</p>
          <p className="text-lg font-medium text-cyan-400">{avgPsnr.toFixed(2)} dB</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Avg FSIM</p>
          <p className="text-lg font-medium text-purple-400">{avgFsim.toFixed(4)}</p>
        </div>
      </div>
    </div>
  )
}
