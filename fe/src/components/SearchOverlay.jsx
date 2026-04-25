import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { buildThumbUrl } from '../lib/image.js'

// ─── In-memory LRU cache for search results ───
const CACHE_MAX = 30
const searchCache = new Map()

function cacheGet(key) {
  if (!searchCache.has(key)) return undefined
  const val = searchCache.get(key)
  // Move to end (most recently used)
  searchCache.delete(key)
  searchCache.set(key, val)
  return val
}

function cacheSet(key, val) {
  if (searchCache.size >= CACHE_MAX) {
    // Delete oldest entry
    const firstKey = searchCache.keys().next().value
    searchCache.delete(firstKey)
  }
  searchCache.set(key, val)
}

export function SearchOverlay({ query, onClose, containerRef }) {
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [cdn, setCdn] = useState('')
  const abortRef = useRef(null)
  const overlayRef = useRef(null)

  // Debounced search with cache + AbortController
  useEffect(() => {
    const trimmed = (query || '').trim()
    if (!trimmed) {
      setResults([])
      setTotal(0)
      setLoading(false)
      return
    }

    // Check cache first — instant results
    const cached = cacheGet(trimmed)
    if (cached) {
      setResults(cached.items)
      setTotal(cached.total)
      setCdn(cached.cdn)
      setLoading(false)
      return
    }

    setLoading(true)

    const timer = setTimeout(() => {
      // Abort previous in-flight request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      ophimApi
        .search(trimmed, 1, { signal: controller.signal })
        .then((json) => {
          if (controller.signal.aborted) return
          const items = json?.data?.items || json?.data?.itemsSearch || []
          const cdnBase = json?.data?.APP_DOMAIN_CDN_IMAGE || ''
          const pagination = json?.data?.params?.pagination
          const totalItems = pagination?.totalItems || items.length
          const sliced = items.slice(0, 8)

          // Cache the result
          cacheSet(trimmed, { items: sliced, total: totalItems, cdn: cdnBase })

          setResults(sliced)
          setTotal(totalItems)
          setCdn(cdnBase)
          setLoading(false)
        })
        .catch((e) => {
          if (e.name === 'AbortError' || controller.signal.aborted) return
          setLoading(false)
        })
    }, 200) // Fast 200ms debounce

    return () => {
      clearTimeout(timer)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [query])

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      const container = containerRef?.current || overlayRef.current
      if (container && !container.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const trimmed = (query || '').trim()
  if (!trimmed) return null

  const displayCount = results.length

  return (
    <div className="search-overlay" ref={overlayRef}>
      {/* Header */}
      <div className="search-overlay-header">
        <span className="search-overlay-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        {loading ? (
          <span className="search-overlay-status">
            <span className="search-spinner" />
            Đang tìm kiếm...
          </span>
        ) : total > 0 ? (
          <span className="search-overlay-status">
            Hiển thị {displayCount} / {total} kết quả cho "<b>{trimmed}</b>"
          </span>
        ) : (
          <span className="search-overlay-status">
            Không tìm thấy kết quả cho "<b>{trimmed}</b>"
          </span>
        )}
        <button
          className="search-overlay-close"
          onClick={onClose}
          aria-label="Đóng tìm kiếm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Results */}
      <div className="search-overlay-list">
        {results.map((item) => {
          const thumb = buildThumbUrl(cdn, item?.thumb_url)
          const title = item?.name || item?.origin_name || item?.slug
          const originName = item?.origin_name || ''
          const year = item?.year || ''
          const quality = item?.quality || 'HD'
          const lang = item?.lang || 'Vietsub'

          return (
            <Link
              key={item._id || item.slug}
              to={`/phim/${encodeURIComponent(item.slug)}`}
              className="search-result-item"
              onClick={onClose}
            >
              <div className="search-result-thumb">
                {thumb ? (
                  <img src={thumb} alt={title} loading="eager" decoding="async" />
                ) : (
                  <div className="search-result-thumb-placeholder" />
                )}
              </div>
              <div className="search-result-info">
                <div className="search-result-title">{title}</div>
                {originName && (
                  <div className="search-result-origin">{originName}</div>
                )}
                <div className="search-result-meta">
                  <span className="search-result-badge">{quality}</span>
                  <span className="search-result-badge">{lang}</span>
                  {year && <span className="search-result-year">{year}</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Footer — view all */}
      {total > displayCount && !loading && (
        <Link
          to={`/tim-kiem?keyword=${encodeURIComponent(trimmed)}`}
          className="search-overlay-footer"
          onClick={onClose}
        >
          Xem tất cả {total} kết quả →
        </Link>
      )}
    </div>
  )
}
