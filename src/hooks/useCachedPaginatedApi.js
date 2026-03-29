import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../../backend/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const RATE_LIMIT_MS = 350 // ~2.85 req/s
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// How old the cache can be before we re-fetch from the API.
// Default: 100 hours. Change to suit your needs.
const DEFAULT_TTL_MS = 100 * 60 * 60 * 1000

export function useCachedPaginatedApi(baseUrl, totalPages = 3, options = {}, ttlMs = DEFAULT_TTL_MS) {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [progress,    setProgress]    = useState({ fetched: 0, total: totalPages })
  const [cacheHit,    setCacheHit]    = useState(false)

  const optionsRef = useRef(options)
  optionsRef.current = options

  // Firestore document key — unique per URL + page count combo
  const cacheKey = `cache_${btoa(baseUrl).replace(/[/+=]/g, '_')}_p${totalPages}`

  // ── Read from Firestore ────────────────────────────────────────────────────
  const readCache = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'api_cache', cacheKey))
      if (!snap.exists()) return null

      const { data, cachedAt } = snap.data()
      const age = Date.now() - cachedAt

      if (age > ttlMs) {
        console.log(`[cache] stale (${(age / 1000 / 60).toFixed(1)} min old) — will re-fetch`)
        return null
      }

      console.log(`[cache] hit ✓ — ${data.length} items, cached ${(age / 1000 / 60).toFixed(1)} min ago`)
      return { data, cachedAt }
    } catch (err) {
      // If Firestore is unavailable, fall through to live fetch
      console.warn('[cache] read failed, falling back to API:', err.message)
      return null
    }
  }, [cacheKey, ttlMs])

  // ── Write to Firestore ─────────────────────────────────────────────────────
  const writeCache = useCallback(async (items) => {
    try {
      await setDoc(doc(db, 'api_cache', cacheKey), {
        data:     items,
        cachedAt: Date.now(),
        url:      baseUrl,
        pages:    totalPages,
      })
      console.log(`[cache] written ✓ — ${items.length} items`)
    } catch (err) {
      // Non-fatal — the data is still shown, just not cached
      console.warn('[cache] write failed:', err.message)
    }
  }, [cacheKey, baseUrl, totalPages])

  // ── Fetch from API ─────────────────────────────────────────────────────────
  const fetchFromApi = useCallback(async () => {
    const allItems = []
    const separator = baseUrl.includes('?') ? '&' : '?'
    const t0 = performance.now()

    for (let page = 1; page <= totalPages; page++) {
      const url = `${baseUrl}${separator}page[number]=${page}`
      const res = await fetch(url, optionsRef.current)

      if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`)

      const json  = await res.json()
      const items = Array.isArray(json) ? json : (json.data ?? [])
      allItems.push(...items)

      setProgress({ fetched: page, total: totalPages })

      if (page < totalPages) await delay(RATE_LIMIT_MS)
    }

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2)
    console.log(`[api] fetched ${totalPages} page(s) · ${allItems.length} items · ${elapsed}s`)

    return allItems
  }, [baseUrl, totalPages])

  // ── Main load function ─────────────────────────────────────────────────────
  const load = useCallback(async (forceRefresh = false) => {
    if (!baseUrl) return
    setLoading(true)
    setError(null)
    setCacheHit(false)
    setProgress({ fetched: 0, total: totalPages })

    try {
      let items = null

      if (!forceRefresh) {
        const cached = await readCache()
        if (cached) {
          items = cached.data
          setLastUpdated(new Date(cached.cachedAt))
          setCacheHit(true)
        }
      }

      if (!items) {
        items = await fetchFromApi()
        await writeCache(items)
        setLastUpdated(new Date())
      }

      // Wrap as { data: [...] } to stay compatible with cleanReports() in App.jsx
      setData({ data: items })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [baseUrl, totalPages, readCache, fetchFromApi, writeCache])

  useEffect(() => { load(false) }, [load])

  // Expose a refetch that always bypasses the cache
  const refetch = useCallback(() => load(true), [load])

  return { data, loading, error, lastUpdated, progress, cacheHit, refetch }
}