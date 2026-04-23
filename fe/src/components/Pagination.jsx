import { Link, useLocation } from 'react-router-dom'

function rangeAround(current, total, radius) {
  const start = Math.max(1, current - radius)
  const end = Math.min(total, current + radius)
  const out = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

function setPageSearch(search, page) {
  const params = new URLSearchParams(search)
  if (page <= 1) params.delete('page')
  else params.set('page', String(page))
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function Pagination({ pagination }) {
  const loc = useLocation()
  const totalItems = Number(pagination?.totalItems || 0)
  const perPage = Number(pagination?.totalItemsPerPage || 24)
  const current = Number(pagination?.currentPage || 1)
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, perPage)))
  const radius = Number(pagination?.pageRanges || 5)

  if (!totalItems || totalPages <= 1) return null

  const pages = rangeAround(current, totalPages, radius)
  const prev = Math.max(1, current - 1)
  const next = Math.min(totalPages, current + 1)

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="muted" style={{ marginBottom: 10 }}>
        Trang {current}/{totalPages} · Tổng {totalItems} kết quả
      </div>
      <div className="episodes" style={{ marginTop: 0 }}>
        <Link className={`epBtn${current === 1 ? ' active' : ''}`} to={`${loc.pathname}${setPageSearch(loc.search, 1)}`}>
          « 1
        </Link>
        <Link className="epBtn" to={`${loc.pathname}${setPageSearch(loc.search, prev)}`}>
          ‹
        </Link>

        {pages.map((p) => (
          <Link
            key={p}
            className={`epBtn${p === current ? ' active' : ''}`}
            to={`${loc.pathname}${setPageSearch(loc.search, p)}`}
          >
            {p}
          </Link>
        ))}

        <Link className="epBtn" to={`${loc.pathname}${setPageSearch(loc.search, next)}`}>
          ›
        </Link>
        <Link
          className={`epBtn${current === totalPages ? ' active' : ''}`}
          to={`${loc.pathname}${setPageSearch(loc.search, totalPages)}`}
        >
          {totalPages} »
        </Link>
      </div>
    </div>
  )
}

