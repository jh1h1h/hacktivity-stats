import { useState, useEffect, useCallback, useRef } from 'react'

const RATE_LIMIT_MS = 350 // ~2.85 req/s, safely under the 3/s limit

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export function usePaginatedApi(baseUrl, totalPages = 3, options = {}) {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [progress,    setProgress]    = useState({ fetched: 0, total: totalPages })

  // Keep options stable across renders
  const optionsRef = useRef(options)
  optionsRef.current = options

  const fetchAll = useCallback(async () => {
    if (!baseUrl) return
    setLoading(true)
    setError(null)
    setProgress({ fetched: 0, total: totalPages })

    const t0 = performance.now()

    try {
      const allItems = []
      const separator = baseUrl.includes('?') ? '&' : '?'

      for (let page = 1; page <= totalPages; page++) {
        const url = `${baseUrl}${separator}page[number]=${page}`
        const res = await fetch(url, optionsRef.current)

        if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`)

        const json = await res.json()

        // Support both { data: [...] } and plain array responses
        const items = Array.isArray(json) ? json : (json.data ?? [])
        allItems.push(...items)

        setProgress({ fetched: page, total: totalPages })

        // Rate limit: wait between requests, but skip the delay after the last one
        if (page < totalPages) await delay(RATE_LIMIT_MS)
      }

      const elapsed = ((performance.now() - t0) / 1000).toFixed(2)
      console.debug(`[usePaginatedApi] fetched ${totalPages} page(s) · ${allItems.length} items · ${elapsed}s`)

      // Wrap in { data: [...] } to match the shape useApi returns,
      // so cleanReports(raw) in App.jsx keeps working unchanged
      setData({ data: allItems })
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [baseUrl, totalPages])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { data, loading, error, lastUpdated, progress, refetch: fetchAll }
}