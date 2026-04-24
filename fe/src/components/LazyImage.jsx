import { memo, useCallback, useEffect, useRef, useState } from 'react'

/**
 * LazyImage — high-performance image component:
 *  - IntersectionObserver with generous rootMargin for early preloading
 *  - Smooth fade-in on load
 *  - Auto-retry once on error
 *  - Gradient placeholder fallback on persistent failure
 *  - Blur placeholder (LQIP) for smooth transitions
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = '',
  priority = false,
  style,
  placeholderSrc, // Optional: tiny blur image URL for LQIP effect
}) {
  const imgRef = useRef(null)
  const [visible, setVisible] = useState(priority) // priority = render immediately
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const retriedRef = useRef(false)

  // IntersectionObserver — start loading when within 400px of viewport
  useEffect(() => {
    if (priority || !src) {
      setVisible(true)
      return
    }
    const el = imgRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '150px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [src, priority])

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    retriedRef.current = false
    if (!priority) setVisible(false)
  }, [src, priority])

  const handleLoad = useCallback(() => setLoaded(true), [])

  const handleError = useCallback(() => {
    if (!retriedRef.current && src) {
      // Retry once with cache-busting
      retriedRef.current = true
      const img = imgRef.current?.querySelector?.('img') || imgRef.current
      if (img && img.tagName === 'IMG') {
        const sep = src.includes('?') ? '&' : '?'
        img.src = `${src}${sep}_r=1`
      }
    } else {
      setFailed(true)
      setLoaded(true) // hide shimmer
    }
  }, [src])

  if (!src) {
    return <div className={`lazy-img lazy-img--placeholder ${className}`} style={style} />
  }

  // Build low-quality placeholder URL (wsrv supports &lqip parameter)
  const placeholderUrl = placeholderSrc || (src.includes('wsrv.nl') && !src.includes('&lqip=')
    ? `${src}&lqip=10`
    : null)

  return (
    <div
      ref={imgRef}
      className={`lazy-img ${loaded ? 'lazy-img--loaded' : ''} ${failed ? 'lazy-img--failed' : ''} ${placeholderUrl && !loaded ? 'lazy-img--placeholder-blur' : ''} ${className}`}
      style={{
        ...style,
        ...(placeholderUrl && !loaded ? { backgroundImage: `url(${placeholderUrl})` } : {}),
      }}
      data-loaded={loaded ? '1' : '0'}
    >
      {visible && !failed && (
        <img
          src={src}
          alt={alt || ''}
          decoding="async"
          fetchpriority={priority ? 'high' : 'low'}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  )
})
