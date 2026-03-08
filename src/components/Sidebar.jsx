// src/components/Sidebar.jsx
const NAV = [
  { id: 'Overview',  label: 'Overview',  icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )},
  { id: 'Analytics', label: 'Analytics', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <polyline points="1,12 5,7 8,9 12,4 15,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'Users',     label: 'Users',     icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 14c0-3 2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M11 3a3 3 0 010 4M14 14c0-3-1.5-5-3-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
  { id: 'Reports',   label: 'Reports',   icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="11" x2="8"  y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
]

function formatTime(date) {
  if (!date) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Sidebar({ active, setActive, loading = false, lastUpdated = null }) {
  return (
    <aside className="w-56 min-h-screen bg-surface border-r border-border flex flex-col shrink-0">
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-5 border-b border-border">
        <div className="w-7 h-7 rounded bg-accent/10 border border-accent/30 flex items-center justify-center">
          <div className="w-2 h-2 rounded-sm bg-accent" />
        </div>
        <span className="text-bright font-bold text-sm tracking-widest uppercase">Observatory</span>
      </div>

      {/* Status pill */}
      {loading ? (
        <div className="mx-4 mt-4 mb-2 px-3 py-2 rounded border border-green/20 bg-green/5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          <span className="text-green text-xs font-mono">LIVE · SYNCING</span>
        </div>
      ) : (
        <div className="mx-4 mt-4 mb-2 px-3 py-2 rounded border border-border bg-base/40 flex flex-col gap-0.5">
          <span className="text-dim text-xs font-mono uppercase tracking-widest">Last Update</span>
          <span className="text-text text-xs font-mono">
            {lastUpdated ? formatTime(lastUpdated) : '—'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {NAV.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-150 text-left
              ${active === id
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-dim hover:text-text hover:bg-muted/40 border border-transparent'
              }`}
          >
            <span className={active === id ? 'text-accent' : 'text-dim'}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-mono text-dim">
            AU
          </div>
          <div>
            <div className="text-xs text-text leading-none">Admin User</div>
            <div className="text-xs text-dim mt-0.5 font-mono">v2.4.1</div>
          </div>
        </div>
      </div>
    </aside>
  )
}