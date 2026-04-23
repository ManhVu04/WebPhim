/**
 * Simple in-memory cache with TTL for API responses.
 * Provides stale-while-revalidate (SWR) pattern:
 *  - Return cached data immediately (even if stale)
 *  - Re-fetch in background if stale
 *  - Deduplicate in-flight requests
 */

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes — fresh
const STALE_TTL = 30 * 60 * 1000  // 30 minutes — stale but usable
const MAX_ENTRIES = 200

class ApiCache {
  constructor() {
    this._store = new Map()
    this._inflight = new Map()
  }

  /** Get cached entry. Returns { data, fresh } or null */
  get(key) {
    const entry = this._store.get(key)
    if (!entry) return null
    const age = Date.now() - entry.ts
    if (age > STALE_TTL) {
      this._store.delete(key)
      return null
    }
    return { data: entry.data, fresh: age < DEFAULT_TTL }
  }

  /** Store data */
  set(key, data) {
    // Evict oldest if too many entries
    if (this._store.size >= MAX_ENTRIES) {
      const oldest = this._store.keys().next().value
      this._store.delete(oldest)
    }
    this._store.set(key, { data, ts: Date.now() })
  }

  /**
   * Fetch with SWR: returns cached data fast, revalidates in background.
   * @param {string} key - Cache key
   * @param {() => Promise<any>} fetcher - Function that returns a promise
   * @param {(data: any) => void} onData - Called with data (may be called twice: cached + fresh)
   * @param {(err: Error) => void} onError
   * @returns {{ abort: () => void }}
   */
  swr(key, fetcher, onData, onError) {
    let cancelled = false
    const cached = this.get(key)

    if (cached) {
      // Return cached data immediately
      onData(cached.data)
      if (cached.fresh) {
        // Don't refetch if fresh
        return { abort() {} }
      }
    }

    // Deduplicate in-flight requests
    if (!this._inflight.has(key)) {
      const promise = fetcher()
        .then((data) => {
          this.set(key, data)
          this._inflight.delete(key)
          return data
        })
        .catch((err) => {
          this._inflight.delete(key)
          throw err
        })
      this._inflight.set(key, promise)
    }

    this._inflight
      .get(key)
      .then((data) => {
        if (!cancelled) onData(data)
      })
      .catch((err) => {
        if (!cancelled && !cached) onError(err)
      })

    return {
      abort() {
        cancelled = true
      },
    }
  }

  /** Prefetch a key without using the result */
  prefetch(key, fetcher) {
    const cached = this.get(key)
    if (cached?.fresh) return // Already fresh

    if (!this._inflight.has(key)) {
      const promise = fetcher()
        .then((data) => {
          this.set(key, data)
          this._inflight.delete(key)
          return data
        })
        .catch(() => {
          this._inflight.delete(key)
        })
      this._inflight.set(key, promise)
    }
  }

  /** Clear all */
  clear() {
    this._store.clear()
    this._inflight.clear()
  }
}

export const apiCache = new ApiCache()
