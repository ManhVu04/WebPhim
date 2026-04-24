import { useEffect, useState } from 'react'
import { apiCache } from './cache.js'

/**
 * Custom hook with SWR caching.
 * - Returns cached data instantly on back-navigation
 * - Revalidates stale data in background
 * - Deduplicates parallel requests for same key
 *
 * @param {string|null} key - Cache key (null = skip)
 * @param {() => Promise<any>} fetcher - Function returning a promise
 * @param {any[]} deps - Dependencies array
 */
export function useFetch(key, fetcher, deps = []) {
  const [data, setData] = useState(() => {
    // Initialize with cached data if available (instant render)
    if (key) {
      const cached = apiCache.get(key)
      if (cached) return cached.data
    }
    return null
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(() => {
    // If we have cached data, don't show loading
    if (key) {
      const cached = apiCache.get(key)
      if (cached) return false
    }
    return !!key
  })

  useEffect(() => {
    if (!key) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    // Check if we have fresh cached data already set
    const cached = apiCache.get(key)
    if (cached?.fresh) {
      setData(cached.data)
      setError(null)
      setLoading(false)
      return
    }

    if (!cached) {
      setLoading(true)
    }

    const handle = apiCache.swr(
      key,
      fetcher,
      (result) => {
        setData(result)
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => handle.abort()
  }, [key, ...deps])

  return { data, error, loading }
}
