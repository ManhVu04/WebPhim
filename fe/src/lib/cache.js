const DEFAULT_TTL = 5 * 60 * 1000
const STALE_TTL = 30 * 60 * 1000
const MAX_ENTRIES = 200

class ApiCache {
  constructor() {
    this._store = new Map()
    this._inflight = new Map()
  }

  get(key) {
    const entry = this._store.get(key)
    if (!entry) return null
    const now = Date.now()
    if (now >= entry.staleAt) {
      this._store.delete(key)
      return null
    }

    // Refresh insertion order so eviction follows actual use, not first insert.
    this._store.delete(key)
    this._store.set(key, entry)
    return { data: entry.data, fresh: now < entry.expiresAt }
  }

  set(key, data, ttl = DEFAULT_TTL, staleTtl = Math.max(STALE_TTL, ttl)) {
    this._store.delete(key)
    while (this._store.size >= MAX_ENTRIES) {
      this._store.delete(this._store.keys().next().value)
    }
    const now = Date.now()
    this._store.set(key, {
      data,
      expiresAt: now + ttl,
      staleAt: now + staleTtl,
    })
  }

  getOrFetch(key, fetcher, ttl = DEFAULT_TTL) {
    const cached = this.get(key)
    if (cached?.fresh) return Promise.resolve(cached.data)
    if (this._inflight.has(key)) return this._inflight.get(key)

    const promise = Promise.resolve()
      .then(fetcher)
      .then((data) => {
        this.set(key, data, ttl)
        return data
      })
      .finally(() => {
        this._inflight.delete(key)
      })
    this._inflight.set(key, promise)
    return promise
  }

  swr(key, fetcher, onData, onError, ttl = DEFAULT_TTL) {
    let cancelled = false
    const cached = this.get(key)
    if (cached) {
      onData(cached.data)
      if (cached.fresh) return { abort() {} }
    }

    this.getOrFetch(key, fetcher, ttl)
      .then((data) => {
        if (!cancelled) onData(data)
      })
      .catch((error) => {
        if (!cancelled && !cached) onError(error)
      })

    return {
      abort() {
        cancelled = true
      },
    }
  }

  prefetch(key, fetcher, ttl = DEFAULT_TTL) {
    return this.getOrFetch(key, fetcher, ttl).catch(() => undefined)
  }

  clear() {
    this._store.clear()
    this._inflight.clear()
  }
}

export const apiCache = new ApiCache()
