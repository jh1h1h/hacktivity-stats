// src/components/MiniBarChart.jsx
// A pure-CSS horizontal bar chart for showing distributions.

export default function MiniBarChart({ data = [], label = '', accentColor = '#00c8ff' }) {
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="card-border rounded-xl p-5 border border-border flex flex-col gap-4">
      <span className="text-xs font-mono text-dim uppercase tracking-widest">{label}</span>
      <div className="space-y-2.5">
        {data.map(({ name, value }) => (
          <div key={name} className="flex items-center gap-3">
            <span className="text-xs font-mono text-dim w-24 truncate shrink-0">{name}</span>
            <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(value / max) * 100}%`,
                  background: accentColor,
                  opacity: 0.7 + (value / max) * 0.3,
                }}
              />
            </div>
            <span className="text-xs font-mono text-text w-8 text-right shrink-0">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
