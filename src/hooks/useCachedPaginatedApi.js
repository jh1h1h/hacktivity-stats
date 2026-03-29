import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../../backend/firebase'
import { doc, getDoc, setDoc, getDocs, collection, writeBatch } from 'firebase/firestore'

const RATE_LIMIT_MS = 350
const CHUNK_SIZE    = 400  // items per Firestore document (~keeps each doc well under 1MB)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// ── Firestore helpers ─────────────────────────────────────────────────────────

// Meta document: stores savedAt + how many chunks exist
const metaRef = () => doc(db, 'api_cache', 'meta')
// Chunk document: stores a slice of items
const chunkRef = (i) => doc(db, 'api_cache', `chunk_${i}`)

async function readAllChunks() {
  try {
    const meta = await getDoc(metaRef())
    if (!meta.exists()) return null

    const { savedAt, chunkCount } = meta.data()
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => getDoc(chunkRef(i)))
    )
    const items = chunks.flatMap(snap => snap.exists() ? snap.data().items : [])
    console.log(`[cache] loaded ${items.length} items across ${chunkCount} chunks (saved ${new Date(savedAt).toLocaleTimeString()})`)
    return { items, savedAt }
  } catch (err) {
    console.warn('[cache] read failed:', err.message)
    return null
  }
}

async function writeAllChunks(items) {
  try {
    const chunks = []
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE))
    }

    // Firestore batches are limited to 500 ops each
    const OPS_PER_BATCH = 499
    let batch     = writeBatch(db)
    let opCount   = 0

    const flush = async () => { await batch.commit(); batch = writeBatch(db); opCount = 0 }

    for (let i = 0; i < chunks.length; i++) {
      batch.set(chunkRef(i), { items: chunks[i] })
      opCount++
      if (opCount >= OPS_PER_BATCH) await flush()
    }

    // Write meta document in the same final batch
    batch.set(metaRef(), { savedAt: Date.now(), chunkCount: chunks.length, totalItems: items.length })
    await batch.commit()

    console.log(`[cache] wrote ${items.length} items across ${chunks.length} chunks`)
  } catch (err) {
    console.warn('[cache] write failed:', err.message)
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCachedPaginatedApi(baseUrl, totalPages = 3, options = {}) {
  const [loading,      setLoading]      = useState(true)
  const [syncing,      setSyncing]      = useState(false)
  const [syncProgress, setSyncProgress] = useState({ fetched: 0, total: totalPages, newItems: 0 })
  const [data,         setData]         = useState(null)
  const [error,        setError]        = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)

  const optionsRef = useRef(options)
  optionsRef.current = options

  const fetchFromApi = useCallback(async (onProgress) => {
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
      onProgress(page)
      if (page < totalPages) await delay(RATE_LIMIT_MS)
    }

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2)
    console.log(`[api] fetched ${totalPages} pages · ${allItems.length} items · ${elapsed}s`)
    return allItems
  }, [baseUrl, totalPages])

  // On mount: read Firestore only, no API call
  const initialLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cached = await readAllChunks()
      if (cached) {
        setData({ data: cached.items })
        setLastUpdated(new Date(cached.savedAt))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // On refresh: fetch API in background, merge new IDs, update cache + UI
  const sync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    setSyncProgress({ fetched: 0, total: totalPages, newItems: 0 })
    setError(null)

    try {
      const cached        = await readAllChunks()
      const existingIds   = new Set((cached?.items ?? []).map(item => String(item.id)))
      const existingItems = cached?.items ?? []

      const fetched  = await fetchFromApi((page) => {
        setSyncProgress(prev => ({ ...prev, fetched: page }))
      })

      const newItems = fetched.filter(item => !existingIds.has(String(item.id)))
      const merged   = [...existingItems, ...newItems]

      console.log(`[sync] ${fetched.length} fetched · ${newItems.length} new · ${merged.length} total`)
      setSyncProgress(prev => ({ ...prev, newItems: newItems.length }))

      await writeAllChunks(merged)
      setData({ data: merged })
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [syncing, totalPages, fetchFromApi])

  useEffect(() => { initialLoad() }, [initialLoad])

  return { data, loading, syncing, syncProgress, error, lastUpdated, refetch: sync }
}