// src/App.jsx  — Observatory Dashboard
// Data source: HackerOne Hacktivity API, cached in Firebase Firestore

import { useState, useMemo } from 'react'
import Sidebar      from './components/Sidebar'
import DataTable    from './components/DataTable'
import { useCachedPaginatedApi } from './hooks/useCachedPaginatedApi'

// ─── Config ───────────────────────────────────────────────────────────────────
const REPORTS_URL = '/api/hackerone/v1/hackers/hacktivity?page[size]=100'
const TOTAL_PAGES = 99

// ─── Clean API response ───────────────────────────────────────────────────────
function cleanReports(data) {
  const flat = flattenReports(data?.data)
  return flat.filter(r => r.severity && r.title)
}

function flattenReports(data) {
  if (!Array.isArray(data)) return []
  return data.map(item => ({
    id:           item.id,
    title:        item.attributes?.title,
    substate:     item.attributes?.substate,
    severity:     item.attributes?.severity_rating,
    cwe:          item.attributes?.cwe,
    votes:        item.attributes?.votes,
    bounty:       item.attributes?.total_awarded_amount,
    disclosed_at: item.attributes?.disclosed_at,
    url:          item.attributes?.url,
    reporter:     item.relationships?.reporter?.data?.attributes?.username,
    program:      item.relationships?.program?.data?.attributes?.name,
    program_url:  item.relationships?.program?.data?.attributes?.url,
  }))
}

// ─── Severity colour helper ───────────────────────────────────────────────────
const SEVERITY_STYLES = {
  critical: { color: '#ff4d6a', bg: 'rgba(255,77,106,0.1)',  border: 'rgba(255,77,106,0.25)' },
  high:     { color: '#ffb800', bg: 'rgba(255,184,0,0.1)',   border: 'rgba(255,184,0,0.25)'  },
  medium:   { color: '#00c8ff', bg: 'rgba(0,200,255,0.08)',  border: 'rgba(0,200,255,0.2)'   },
  low:      { color: '#00e5a0', bg: 'rgba(0,229,160,0.08)',  border: 'rgba(0,229,160,0.2)'   },
  none:     { color: '#4a6080', bg: 'rgba(74,96,128,0.1)',   border: 'rgba(74,96,128,0.2)'   },
}

const SUBSTATE_STYLES = {
  resolved:    { color: '#00e5a0' },
  triaged:     { color: '#00c8ff' },
  duplicate:   { color: '#4a6080' },
  informative: { color: '#4a6080' },
  n_a:         { color: '#4a6080' },
}

const FILTER_FIELDS = [
  { key: 'substate', label: 'State' },
  { key: 'severity', label: 'Severity' },
]

const EMPTY_FILTER_VALUE = '__empty__'

const normalizeFilterValue = value => {
  if (value == null || value === '') return EMPTY_FILTER_VALUE
  return String(value).toLowerCase()
}

// ─── Table column definitions ─────────────────────────────────────────────────
const REPORTS_COLUMNS = [
  {
    key: 'severity',
    label: 'Severity',
    render: v => {
      const s = SEVERITY_STYLES[v?.toLowerCase()] ?? SEVERITY_STYLES.none
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide"
          style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
          {v ?? '—'}
        </span>
      )
    },
  },
  {
    key: 'title',
    label: 'Title',
    render: (v, row) => (
      <a href={row.url} target="_blank" rel="noreferrer"
        className="text-text hover:text-accent transition-colors line-clamp-1"
        title={v}>
        {v}
      </a>
    ),
  },
  {
    key: 'program',
    label: 'Program',
    render: (v, row) => (
      <a href={row.program_url} target="_blank" rel="noreferrer"
        className="text-dim hover:text-accent transition-colors whitespace-nowrap">
        {v ?? '—'}
      </a>
    ),
  },
  {
    key: 'reporter',
    label: 'Reporter',
    render: v => <span className="text-dim font-mono">@{v ?? '—'}</span>,
  },
  {
    key: 'cwe',
    label: 'CWE',
    render: v => <span className="text-dim">{v ?? '—'}</span>,
  },
  {
    key: 'substate',
    label: 'State',
    render: v => {
      const s = SUBSTATE_STYLES[v?.toLowerCase()] ?? SUBSTATE_STYLES.n_a
      return (
        <span className="font-mono text-xs uppercase" style={{ color: s.color }}>
          {v ?? '—'}
        </span>
      )
    },
  },
  {
    key: 'bounty',
    label: 'Bounty',
    render: v => v
      ? <span className="text-green font-mono">${Number(v).toLocaleString()}</span>
      : <span className="text-dim font-mono">—</span>,
  },
  {
    key: 'votes',
    label: 'Votes',
    render: v => <span className="font-mono text-dim">{v ?? 0}</span>,
  },
  {
    key: 'disclosed_at',
    label: 'Disclosed',
    render: v => v
      ? <span className="font-mono text-dim whitespace-nowrap">{new Date(v).toLocaleDateString()}</span>
      : <span className="text-dim">—</span>,
  },
]

// ─── Timestamp ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date())
  useState(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  })
  return (
    <span className="font-mono text-xs text-dim tabular-nums">
      {time.toUTCString().replace(' GMT', ' UTC')}
    </span>
  )
}

// ─── Sync status badge ────────────────────────────────────────────────────────
function SyncBadge({ syncing, syncProgress }) {
  if (!syncing) return null
  const pct = Math.round((syncProgress.fetched / syncProgress.total) * 100)
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-accent/20 bg-accent/5">
      {/* Animated progress bar */}
      <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-accent tabular-nums">
        {syncProgress.fetched}/{syncProgress.total} pages
      </span>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState('Overview')
  const [filters, setFilters] = useState(() =>
    FILTER_FIELDS.reduce((acc, field) => {
      acc[field.key] = []
      return acc
    }, {})
  )

  const { data: raw, loading, syncing, syncProgress, error, lastUpdated, refetch } =
    useCachedPaginatedApi(REPORTS_URL, TOTAL_PAGES)

  const reports = useMemo(() => cleanReports(raw), [raw])

  const filterOptions = useMemo(() => {
    const optionsByField = {}

    FILTER_FIELDS.forEach(({ key }) => {
      const unique = new Map()

      reports.forEach(report => {
        const rawValue = report[key]
        const normalized = normalizeFilterValue(rawValue)
        if (!unique.has(normalized)) {
          unique.set(normalized, rawValue ?? '—')
        }
      })

      optionsByField[key] = Array.from(unique.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    })

    return optionsByField
  }, [reports])

  const filteredReports = useMemo(() => {
    return reports.filter(report =>
      FILTER_FIELDS.every(({ key }) => {
        const activeValues = filters[key] ?? []
        if (activeValues.length === 0) return true
        return activeValues.includes(normalizeFilterValue(report[key]))
      })
    )
  }, [reports, filters])

  const hasActiveFilters = FILTER_FIELDS.some(({ key }) => (filters[key] ?? []).length > 0)

  const toggleFilter = (fieldKey, value) => {
    setFilters(prev => {
      const current = prev[fieldKey] ?? []
      const nextValues = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]

      return { ...prev, [fieldKey]: nextValues }
    })
  }

  const clearFieldFilter = fieldKey => {
    setFilters(prev => ({ ...prev, [fieldKey]: [] }))
  }

  const clearAllFilters = () => {
    setFilters(
      FILTER_FIELDS.reduce((acc, field) => {
        acc[field.key] = []
        return acc
      }, {})
    )
  }

  return (
    <div className="flex min-h-screen bg-base grid-bg font-sans overflow-hidden">
      {/* Sidebar gets syncing state, not loading, so it shows "last update" immediately */}
      <Sidebar active={active} setActive={setActive} loading={syncing} lastUpdated={lastUpdated} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-bright font-semibold">{active}</span>
            <span className="text-dim text-xs font-mono">/ overview</span>
          </div>
          <div className="flex items-center gap-5">
            <SyncBadge syncing={syncing} syncProgress={syncProgress} />
            <LiveClock />
            <button
              onClick={refetch}
              disabled={syncing}
              title="Fetch latest from HackerOne API and merge into cache"
              className="text-xs font-mono text-dim hover:text-accent transition-colors border border-border hover:border-accent/40 rounded px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {syncing ? '⟳ SYNCING…' : '↻ UPDATE DATA'}
            </button>
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="border border-red/30 bg-red/5 rounded-xl px-4 py-3 text-xs font-mono text-red">
              ✕ FETCH ERROR · {error}
            </div>
          )}

          {/* Section label — shows sync result once done */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-dim uppercase tracking-widest">Hacktivity</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-mono text-dim">
              {loading
                ? 'loading from cache…'
                : syncing
                  ? `syncing… ${syncProgress.fetched} / ${syncProgress.total} pages`
                  : hasActiveFilters
                    ? `${filteredReports.length} / ${reports.length} reports`
                    : `${reports.length} reports`
              }
            </span>
          </div>

          {!loading && (
            <section className="card-border rounded-xl border border-border p-4 bg-surface/30 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-xs font-mono text-dim uppercase tracking-widest">Filters</span>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-mono text-dim hover:text-accent transition-colors border border-border hover:border-accent/40 rounded px-2 py-1"
                  >
                    CLEAR ALL
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {FILTER_FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-mono text-dim uppercase tracking-widest">{label}</span>
                      {(filters[key] ?? []).length > 0 && (
                        <button
                          onClick={() => clearFieldFilter(key)}
                          className="text-xs font-mono text-dim hover:text-accent transition-colors"
                        >
                          reset
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(filterOptions[key] ?? []).map(option => {
                        const selected = (filters[key] ?? []).includes(option.value)
                        return (
                          <button
                            key={option.value}
                            onClick={() => toggleFilter(key, option.value)}
                            className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                              selected
                                ? 'text-accent border-accent/40 bg-accent/10'
                                : 'text-dim border-border hover:text-text hover:border-accent/30'
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Table: uses loading (skeleton on first open), not syncing */}
          <DataTable
            columns={REPORTS_COLUMNS}
            rows={filteredReports}
            isLoading={loading}
          />

          <div className="pb-2 text-center text-xs font-mono text-muted">
            OBSERVATORY · DATA DASHBOARD · {new Date().getFullYear()}
          </div>

        </main>
      </div>
    </div>
  )
}