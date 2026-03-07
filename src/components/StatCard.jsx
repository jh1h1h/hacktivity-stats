// src/components/StatCard.jsx
import { useEffect, useRef, useState } from 'react'

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (typeof target !== 'number') return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setValue(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return value
}

const TREND_COLORS = {
  up:      'text-green',
  down:    'text-red',
  neutral: 'text-dim',
}

export default function StatCard({ label, value, suffix = '', trend, trendLabel, accent = 'accent', loading = false }) {
  const numericValue  = typeof value === 'number' ? value : 0
  const animatedValue = useCountUp(loading ? 0 : numericValue)
  const displayValue  = loading ? '···' : (typeof value === 'number' ? animatedValue.toLocaleString() : value)

  const accentMap = {
    accent: { border: 'border-accent/20', bar: 'bg-accent',  glow: 'shadow-[0_0_20px_rgba(0,200,255,0.08)]' },
    green:  { border: 'border-green/20',  bar: 'bg-green',   glow: 'shadow-[0_0_20px_rgba(0,229,160,0.08)]' },
    amber:  { border: 'border-amber/20',  bar: 'bg-amber',   glow: 'shadow-[0_0_20px_rgba(255,184,0,0.08)]' },
    red:    { border: 'border-red/20',    bar: 'bg-red',     glow: 'shadow-[0_0_20px_rgba(255,77,106,0.08)]' },
  }
  const { border, bar, glow } = accentMap[accent] ?? accentMap.accent

  return (
    <div className={`stat-card animate-slide-up card-border rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden ${glow} border ${border}`}>
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-px ${bar} opacity-60`} />

      <div className="flex items-start justify-between">
        <span className="text-xs font-mono text-dim uppercase tracking-widest">{label}</span>
        {trend && (
          <span className={`text-xs font-mono ${TREND_COLORS[trend] ?? 'text-dim'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-bright font-mono tabular-nums leading-none">
          {displayValue}
        </span>
        {suffix && !loading && (
          <span className="text-sm text-dim font-mono">{suffix}</span>
        )}
      </div>
    </div>
  )
}
