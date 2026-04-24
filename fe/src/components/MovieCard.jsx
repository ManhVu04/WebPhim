import { memo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { buildThumbUrl } from '../lib/image.js'
import { prefetchMovie } from '../lib/api.js'
import { LazyImage } from './LazyImage.jsx'

export const MovieCard = memo(function MovieCard({ cdnBase, item, priority }) {
  const thumb = buildThumbUrl(cdnBase, item?.thumb_url)
  const title = item?.name || item?.origin_name || item?.slug
  const prefetched = useRef(false)
  const imagePreloadRef = useRef(null)

  const handleMouseEnter = useCallback(() => {
    if (!prefetched.current && item?.slug) {
      prefetched.current = true
      prefetchMovie(item.slug)
    }
    // Preload ảnh ngay khi hover (nhanh hơn IntersectionObserver)
    if (thumb && !imagePreloadRef.current) {
      imagePreloadRef.current = new Image()
      imagePreloadRef.current.src = thumb
    }
  }, [item?.slug, thumb])

  return (
    <Link
      to={`/phim/${encodeURIComponent(item.slug)}`}
      className="card"
      onMouseEnter={handleMouseEnter}
    >
      <LazyImage
        src={thumb}
        alt={title}
        className="poster"
        priority={priority}
      />
      <div className="badge">
        {item?.quality || 'HD'} · {item?.lang || 'Vietsub'}
      </div>
      <div className="card-body">
        <div className="title">{title}</div>
        <div className="meta">
          <span>{item?.year || '—'}</span>
          <span>{item?.episode_current || item?.time || ''}</span>
        </div>
      </div>
    </Link>
  )
})
