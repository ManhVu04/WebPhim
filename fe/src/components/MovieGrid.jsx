import { memo } from 'react'
import { MovieCard } from './MovieCard.jsx'

// First 6 items are above-the-fold (first row in 6-column grid)
const PRIORITY_COUNT = 6

export const MovieGrid = memo(function MovieGrid({ cdnBase, items }) {
  if (!items?.length) return <div className="muted">Không có dữ liệu.</div>

  return (
    <div className="grid">
      {items.map((it, i) => (
        <MovieCard
          key={it._id || it.slug}
          cdnBase={cdnBase}
          item={it}
          priority={i < PRIORITY_COUNT}
        />
      ))}
    </div>
  )
})
