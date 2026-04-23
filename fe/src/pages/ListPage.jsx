import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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
    <>
      <div className="section-title">
        <h1>{title}</h1>
        <div className="muted">{items.length} phim</div>
      </div>
      <MovieGrid cdnBase={cdn} items={items} />
      <Pagination pagination={pagination} />
    </>
  )
}

