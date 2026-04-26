import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { MovieGrid } from '../components/MovieGrid.jsx'
import { ErrorState, Loading } from '../components/State.jsx'
import { Pagination } from '../components/Pagination.jsx'

const TITLE_MAP = {
  'phim-moi': 'Phim mới',
  'phim-le': 'Phim lẻ',
  'phim-bo': 'Phim bộ',
  'hoat-hinh': 'Hoạt hình',
  'tv-shows': 'TV Shows',
}

export function ListPage() {
  const { type = 'phim-moi' } = useParams()
  const [params] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') || 1))

  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ophimApi
      .list(type, page)
      .then((json) => {
        if (!alive) return
        setData(json)
        setErr(null)
      })
      .catch((e) => alive && setErr(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [type, page])

  const title = useMemo(() => TITLE_MAP[type] || type, [type])

  if (loading) return <Loading label="Đang tải danh sách phim..." />
  if (err) return <ErrorState error={err} />

  const items = data?.data?.items || []
  const cdn = data?.data?.APP_DOMAIN_CDN_IMAGE || ''
  const pagination = data?.data?.params?.pagination

  return (
    <div className="list-page-shell">
      <section className="hero-hero panel">
        <div className="hero-copy">
          <p className="eyebrow">{title}</p>
          <h1>Kho phim nhẹ mắt, ấm áp và dễ xem hơn cho mọi thời điểm trong ngày.</h1>
          <p className="hero-lead">
            Khám phá phim với màu sắc dịu, bố cục rõ ràng và cảm giác thoải mái khi lướt lâu trên cả điện thoại lẫn màn hình lớn.
          </p>
        </div>
        <div className="hero-meta">
          <div>
            <span className="hero-meta-label">Hiện có</span>
            <strong>{items.length} phim</strong>
          </div>
          <div>
            <span className="hero-meta-label">Trang</span>
            <strong>{page}</strong>
          </div>
        </div>
        <div className="hero-links">
          <Link to="/danh-sach/phim-moi?page=1" className="hero-link">Phim mới</Link>
          <Link to="/danh-sach/phim-bo?page=1" className="hero-link">Phim bộ</Link>
          <Link to="/the-loai" className="hero-link">Thể loại</Link>
          <Link to="/quoc-gia" className="hero-link">Quốc gia</Link>
        </div>
      </section>
      <MovieGrid cdnBase={cdn} items={items} />
      <Pagination pagination={pagination} />
    </div>
  )
}

