'use client'

import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, CartesianAxis
} from 'recharts'
import { motion } from 'framer-motion'
import { PairMetrics } from '@/lib/api'

interface ComparisonDashboardProps {
  metrics: PairMetrics[]
}

export function ComparisonDashboard({ metrics }: ComparisonDashboardProps) {
  if (!metrics || metrics.length === 0) return null;

  // Format data for Recharts
  const data = metrics.map((m) => ({
    name: `T${m.pair_index}→T${m.pair_index + 1}`,
    ssim: m.ssim,
    psnr: m.psnr,
    mse: m.mse,
    fsim: m.fsim,
  }));

  return (
    <div className="glass rounded-2xl p-6 border border-slate-700/40 mt-8">
      <p className="text-xs uppercase tracking-widest text-cyan-400 mb-6">Metrics Dashboard</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* SSIM Chart */}
        <div className="h-64">
          <p className="text-xs font-semibold text-slate-400 mb-2">SSIM (Structural Similarity) - Higher is better</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 0.05', 'dataMax + 0.05']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#4ade80' }}
              />
              <Line type="monotone" dataKey="ssim" stroke="#4ade80" strokeWidth={2} dot={{ r: 4, fill: '#4ade80' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* PSNR Chart */}
        <div className="h-64">
          <p className="text-xs font-semibold text-slate-400 mb-2">PSNR (Peak Signal-to-Noise Ratio) - Higher is better (dB)</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#22d3ee' }}
              />
              <Line type="monotone" dataKey="psnr" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4, fill: '#22d3ee' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* FSIM Chart */}
        <div className="h-64">
          <p className="text-xs font-semibold text-slate-400 mb-2">FSIM (Feature Similarity) - Higher is better</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 0.05', 'dataMax + 0.05']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#c084fc' }}
              />
              <Line type="monotone" dataKey="fsim" stroke="#c084fc" strokeWidth={2} dot={{ r: 4, fill: '#c084fc' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MSE Chart */}
        <div className="h-64">
          <p className="text-xs font-semibold text-slate-400 mb-2">MSE (Mean Squared Error) - Lower is better</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 'dataMax + 0.01']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fb923c' }}
              />
              <Line type="monotone" dataKey="mse" stroke="#fb923c" strokeWidth={2} dot={{ r: 4, fill: '#fb923c' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
