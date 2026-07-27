import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { cacheKeys, ophimApi } from '../lib/api.js'
import { MovieGrid } from '../components/MovieGrid.jsx'
import { ErrorState, Loading } from '../components/State.jsx'
import { Pagination } from '../components/Pagination.jsx'
import { usePrerenderData } from '../lib/prerenderData.jsx'

const TITLE_MAP = {
  'phim-moi': 'Phim mới',
  'phim-le': 'Phim lẻ',
  'phim-bo': 'Phim bộ',
  'hoat-hinh': 'Hoạt hình',
  'tv-shows': 'TV Shows',
  'phim-chieu-rap': 'Phim chiếu rạp',
  'phim-sap-chieu': 'Phim sắp chiếu',
}

export function ListPage() {
  const { type = 'phim-moi' } = useParams()
  const [params] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') || 1))
  const prerenderData = usePrerenderData()
  const initialData = prerenderData[cacheKeys.list(type, page)]

  const [data, setData] = useState(initialData || null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      setErr(null)
      setLoading(false)
      return
    }
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
  }, [type, page, initialData])

  const title = useMemo(() => TITLE_MAP[type] || type, [type])

  if (loading) return <Loading label="Đang tải danh sách phim..." />
  if (err) return <ErrorState error={err} />

  const items = data?.data?.items || []
  const cdn = data?.data?.APP_DOMAIN_CDN_IMAGE || ''
  const pagination = data?.data?.params?.pagination

  return (
    <div className="list-page-shell">
      <div className="page-heading">
        <h1>Danh sách {title}</h1>
        <span>Trang {page}</span>
      </div>
      <MovieGrid cdnBase={cdn} items={items} />
      <Pagination pagination={pagination} />
    </div>
  )
}
