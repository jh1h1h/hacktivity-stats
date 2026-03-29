// src/App.jsx  — Observatory Dashboard
// Data source: JSONPlaceholder (swap for your real API)

import { useState, useMemo } from 'react'
import Sidebar       from './components/Sidebar'
import StatCard      from './components/StatCard'
import DataTable     from './components/DataTable'
import MiniBarChart  from './components/MiniBarChart'
import { useCachedPaginatedApi } from './hooks/useCachedPaginatedApi'

// ─── Config ───────────────────────────────────────────────────────────────────
const REPORTS_URL  = '/api/hackerone/v1/hackers/hacktivity?page[size]=100'
const TOTAL_PAGES  = 20 // ← change this to fetch more/fewer pages (100 results each)

// ─── Clean API response ─────────────────────
function cleanReports(data) {
  data = flattenReports(data?.data)
  data = data.filter(r => r.disclosed) // Only include reports with severity & title
  return data
}

// ─── Flatten nested API response into table-friendly rows ─────────────────────
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
    disclosed:    item.attributes?.disclosed,
    url:          item.attributes?.url,
    submitted_at: item.attributes?.submitted_at,
    reporter:     item.relationships?.reporter?.data?.attributes?.username,
    program:      item.relationships?.program?.data?.attributes?.name,
    program_url:  item.relationships?.program?.data?.attributes?.url,
  }))
}

// ─── Severity colour helper ───────────────────────────────────────────────────
const SEVERITY_STYLES = {
  critical: { color: '#ff4d6a', bg: 'rgba(255,77,106,0.1)',   border: 'rgba(255,77,106,0.25)' },
  high:     { color: '#ffb800', bg: 'rgba(255,184,0,0.1)',    border: 'rgba(255,184,0,0.25)'  },
  medium:   { color: '#00c8ff', bg: 'rgba(0,200,255,0.08)',   border: 'rgba(0,200,255,0.2)'   },
  low:      { color: '#00e5a0', bg: 'rgba(0,229,160,0.08)',   border: 'rgba(0,229,160,0.2)'   },
  none:     { color: '#4a6080', bg: 'rgba(74,96,128,0.1)',    border: 'rgba(74,96,128,0.2)'   },
}

const SUBSTATE_STYLES = {
  resolved:   { color: '#00e5a0' },
  triaged:    { color: '#00c8ff' },
  duplicate:  { color: '#4a6080' },
  informative:{ color: '#4a6080' },
  n_a:        { color: '#4a6080' },
}

// ─── Table column definitions ─────────────────────────────────────────────────
const REPORTS_COLUMNS = [
  { key: 'cwe', label: 'CWE' },
  { key: 'title', label: 'Title' },
  { key: 'severity', label: 'Severity' },
  { key: 'bounty', label: 'Bounty' },
  { key: 'substate', label: 'Status' },
  { key: 'reporter', label: 'Reporter' },
  { key: 'program', label: 'Program' },
  { key: 'submitted_at', label: 'Submitted', render: v => new Date(v).toLocaleDateString() },
  // { key: 'username', label: 'Handle',  render: v => `@${v}` },
  // { key: 'company',  label: 'Company', render: (_, row) => row.company?.name ?? '—' },
  // { key: 'postCount',label: 'Posts',
  //   render: v => (
  //     <span className="inline-flex items-center justify-center w-6 h-5 rounded text-xs bg-accent/10 text-accent border border-accent/20">
  //       {v}
  //     </span>
  //   )
  // },
  // { key: 'done',     label: 'Completed',
  //   render: v => (
  //     <span className={`inline-flex items-center gap-1 text-xs font-mono ${v > 0 ? 'text-green' : 'text-dim'}`}>
  //       <span className={`w-1.5 h-1.5 rounded-full ${v > 0 ? 'bg-green' : 'bg-muted'}`} />
  //       {v}
  //     </span>
  //   )
  // },
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
      {time.toUTCString()}
    </span>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState('Overview')

  const { data: raw, loading: rLoad, error: rErr, lastUpdated: rTime, refetch: refetchReports } = useCachedPaginatedApi(REPORTS_URL, TOTAL_PAGES)

  const reports = useMemo(() => cleanReports(raw), [raw])

  const loading = rLoad
  const error   = rErr

  // Most recent successful fetch across all three endpoints
  const lastUpdated = [rTime]
    .filter(Boolean)
    .sort((a, b) => b - a)[0] ?? null

  const handleRefresh = () => {
    refetchReports()
  }

  // ── Aggregations ────────────────────────────────────────────────────────────
  // const stats = useMemo(() => {
  //   if (!reports) return null

  //   const postsByUser = posts.reduce((acc, p) => {
  //     acc[p.userId] = (acc[p.userId] ?? 0) + 1
  //     return acc
  //   }, {})

  //   const completedByUser = todos.reduce((acc, t) => {
  //     if (t.completed) acc[t.userId] = (acc[t.userId] ?? 0) + 1
  //     return acc
  //   }, {})

  //   const enrichedUsers = users.map(u => ({
  //     ...u,
  //     postCount: postsByUser[u.id] ?? 0,
  //     done:      completedByUser[u.id] ?? 0,
  //   }))

  //   const completedTodos = todos.filter(t => t.completed).length
  //   const completionRate = Math.round((completedTodos / todos.length) * 100)

  //   const topPosters = [...enrichedUsers]
  //     .sort((a, b) => b.postCount - a.postCount)
  //     .slice(0, 6)
  //     .map(u => ({ name: u.username, value: u.postCount }))

  //   return {
  //     totalUsers:      users.length,
  //     totalPosts:      posts.length,
  //     completedTodos,
  //     completionRate,
  //     avgPostsPerUser: Math.round(posts.length / users.length),
  //     enrichedUsers,
  //     topPosters,
  //   }
  // }, [users, posts, todos])

  return (
    <div className="flex min-h-screen bg-base grid-bg font-sans overflow-hidden">
      <Sidebar active={active} setActive={setActive} loading={loading} lastUpdated={lastUpdated} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-bright font-semibold">{active}</span>
            <span className="text-dim text-xs font-mono">/ overview</span>
          </div>
          <div className="flex items-center gap-5">
            <LiveClock />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="text-xs font-mono text-dim hover:text-accent transition-colors border border-border hover:border-accent/40 rounded px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↻ REFRESH
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

          {/* Section label */}
          {/* <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-dim uppercase tracking-widest">System Metrics</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-mono text-dim">
              {loading ? 'loading…' : `${stats?.totalUsers ?? 0} entities tracked`}
            </span>
          </div> */}

          {/* ── Stat cards ───────────────────────────────────────────────── */}
          {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={loading ? null : stats?.totalUsers}
              loading={loading}
              accent="accent"
              trend="up"
              trendLabel="+2.4%"
            />
            <StatCard
              label="Posts Published"
              value={loading ? null : stats?.totalPosts}
              loading={loading}
              accent="green"
              trend="up"
              trendLabel="+8.1%"
            />
            <StatCard
              label="Tasks Completed"
              value={loading ? null : stats?.completedTodos}
              loading={loading}
              accent="amber"
              trend="neutral"
              trendLabel="±0.3%"
            />
            <StatCard
              label="Completion Rate"
              value={loading ? null : stats?.completionRate}
              suffix="%"
              loading={loading}
              accent="red"
              trend="down"
              trendLabel="-1.2%"
            />
          </div> */}

          {/* ── Charts row ───────────────────────────────────────────────── */}
          {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MiniBarChart
              label="Top Posters by Volume"
              data={loading ? [] : (stats?.topPosters ?? [])}
              accentColor="#00c8ff"
            /> */}

            {/* Summary panel */}
            {/* <div className="col-span-2 card-border rounded-xl border border-border p-5 flex flex-col gap-4">
              <span className="text-xs font-mono text-dim uppercase tracking-widest">Aggregate Summary</span>
              <div className="grid grid-cols-3 gap-4 flex-1">
                {[
                  { k: 'Avg posts / user', v: loading ? '···' : stats?.avgPostsPerUser },
                  { k: 'Total tasks',      v: loading ? '···' : todos?.length },
                  { k: 'Pending tasks',    v: loading ? '···' : (todos?.length ?? 0) - (stats?.completedTodos ?? 0) },
                ].map(({ k, v }) => (
                  <div key={k} className="flex flex-col gap-2 p-4 rounded-lg bg-base/60 border border-border/60">
                    <span className="text-xs font-mono text-dim">{k}</span>
                    <span className="text-2xl font-bold font-mono text-bright tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-dim font-mono border-t border-border pt-3">
                Source · jsonplaceholder.typicode.com · Replace with your own endpoints in <code className="text-accent">src/App.jsx</code>
              </p>
            </div>
          </div> */}

          {/* ── Section label ────────────────────────────────────────────── */}
          {/* <div className="flex items-center gap-3 pt-2">
            <span className="text-xs font-mono text-dim uppercase tracking-widest">Entity Records</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-mono text-dim">
              {loading ? '—' : `${stats?.enrichedUsers?.length ?? 0} rows`}
            </span>
          </div> */}
          {/* ── Data table ───────────────────────────────────────────────── */}
          <DataTable
            columns={REPORTS_COLUMNS}
            rows={reports}
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