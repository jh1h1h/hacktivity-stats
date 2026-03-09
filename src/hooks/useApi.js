import { useState, useEffect, useCallback } from 'react'

export function useApi(url, options = {}) {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Stringify options so useCallback doesn't fire on every render
  // when options is defined as an inline object literal
  const optionsKey = JSON.stringify(options)

  const fetchData = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, optionsKey])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, lastUpdated, refetch: fetchData }
}