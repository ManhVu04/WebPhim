import { apiCache } from './cache.js'

const VITE_ENV = import.meta.env ?? {}
const API_PREFIX = (VITE_ENV.VITE_API_BASE_URL ?? '/api/ophim').replace(/\/$/, '')
const DIRECT_API_PREFIX = String(VITE_ENV.VITE_DIRECT_API_BASE_URL ?? '').replace(/\/$/, '')
const DIRECT_FALLBACK_ENABLED =
  VITE_ENV.VITE_ENABLE_DIRECT_API_FALLBACK === 'true' && Boolean(DIRECT_API_PREFIX)

const TTL = {
  home: 20_000,
  list: 30_000,
  search: 10_000,
  taxonomy: 30 * 60_000,
  movie: 2 * 60_000,
}

class ApiRequestError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

function buildApiUrl(prefix, path) {
  return `${prefix}${path.startsWith('/') ? path : `/${path}`}`
}

function canUseDirectFallback(error) {
  if (!DIRECT_FALLBACK_ENABLED || !API_PREFIX.startsWith('/')) return false
  return error?.status == null || [502, 503, 504].includes(error.status)
}

async function fetchJsonFrom(prefix, path, { signal } = {}) {
  let res
  try {
    res = await fetch(buildApiUrl(prefix, path), {
      headers: { accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiRequestError(error?.message || 'Network request failed')
  }

  const text = await res.text()
  if (!res.ok) {
    throw new ApiRequestError(text || `HTTP ${res.status}`, res.status)
  }
  try {
    return text ? JSON.parse(text) : null
  } catch {
    throw new ApiRequestError('API returned invalid JSON', res.status)
  }
}

async function fetchWithOptionalFallback(path, { signal } = {}) {
  try {
    return await fetchJsonFrom(API_PREFIX, path, { signal })
  } catch (error) {
    if (signal?.aborted || !canUseDirectFallback(error)) throw error
    return fetchJsonFrom(DIRECT_API_PREFIX, path, { signal })
  }
}

function requestJson(path, { signal, cacheKey, ttl = 0 } = {}) {
  const fetcher = () => fetchWithOptionalFallback(path, { signal })
  if (!cacheKey || signal) return fetcher()
  return apiCache.getOrFetch(cacheKey, fetcher, ttl)
}

export const cacheKeys = {
  home: () => 'home',
  list: (type, page) => `list:${type}:${page}`,
  search: (keyword, page) => `search:${keyword}:${page}`,
  categories: () => 'categories',
  category: (slug, page) => `cat:${slug}:${page}`,
  countries: () => 'countries',
  country: (slug, page) => `country:${slug}:${page}`,
  years: () => 'years',
  year: (year, page) => `year:${year}:${page}`,
  movie: (slug) => `movie:${slug}`,
  movieImages: (slug) => `movie-images:${slug}`,
  moviePeople: (slug) => `movie-people:${slug}`,
}

export const ophimApi = {
  home() {
    return requestJson('/home', { cacheKey: cacheKeys.home(), ttl: TTL.home })
  },
  list(typeSlug, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString()
    return requestJson(`/danh-sach/${encodeURIComponent(typeSlug)}?${q}`, {
      cacheKey: cacheKeys.list(typeSlug, page),
      ttl: TTL.list,
    })
  },
  search(keyword, page = 1, { signal } = {}) {
    const q = new URLSearchParams({ keyword: keyword ?? '', page: String(page) }).toString()
    return requestJson(`/tim-kiem?${q}`, {
      signal,
      cacheKey: cacheKeys.search(keyword, page),
      ttl: TTL.search,
    })
  },
  categories() {
    return requestJson('/the-loai', { cacheKey: cacheKeys.categories(), ttl: TTL.taxonomy })
  },
  category(slug, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString()
    return requestJson(`/the-loai/${encodeURIComponent(slug)}?${q}`, {
      cacheKey: cacheKeys.category(slug, page),
      ttl: TTL.list,
    })
  },
  countries() {
    return requestJson('/quoc-gia', { cacheKey: cacheKeys.countries(), ttl: TTL.taxonomy })
  },
  country(slug, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString()
    return requestJson(`/quoc-gia/${encodeURIComponent(slug)}?${q}`, {
      cacheKey: cacheKeys.country(slug, page),
      ttl: TTL.list,
    })
  },
  years() {
    return requestJson('/nam-phat-hanh', { cacheKey: cacheKeys.years(), ttl: TTL.taxonomy })
  },
  year(year, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString()
    return requestJson(`/nam-phat-hanh/${encodeURIComponent(String(year))}?${q}`, {
      cacheKey: cacheKeys.year(year, page),
      ttl: TTL.list,
    })
  },
  movie(slug) {
    return requestJson(`/phim/${encodeURIComponent(slug)}`, {
      cacheKey: cacheKeys.movie(slug),
      ttl: TTL.movie,
    })
  },
  movieImages(slug) {
    return requestJson(`/phim/${encodeURIComponent(slug)}/images`, {
      cacheKey: cacheKeys.movieImages(slug),
      ttl: TTL.movie,
    })
  },
  moviePeople(slug) {
    return requestJson(`/phim/${encodeURIComponent(slug)}/peoples`, {
      cacheKey: cacheKeys.moviePeople(slug),
      ttl: TTL.movie,
    })
  },
}

export function prefetchMovie(slug) {
  return ophimApi.movie(slug).catch(() => undefined)
}

export function prefetchList(type, page) {
  return ophimApi.list(type, page).catch(() => undefined)
}
