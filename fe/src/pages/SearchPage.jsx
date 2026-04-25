import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { MovieGrid } from '../components/MovieGrid.jsx'
import { ErrorState, Loading } from '../components/State.jsx'
import { Pagination } from '../components/Pagination.jsx'

export function SearchPage() {
  const [params] = useSearchParams()
  const keyword = useMemo(() => (params.get('keyword') || '').trim(), [params])
  const page = Math.max(1, Number(params.get('page') || 1))

  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!keyword) return
    let alive = true
    setLoading(true)
    ophimApi
      .search(keyword, page)
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
  }, [keyword, page])

  if (!keyword) {
    return <div className="panel muted">Nhập từ khóa ở ô tìm kiếm phía trên.</div>
  }

  if (loading) return <Loading label={`Đang tìm “${keyword}”...`} />
  if (err) return <ErrorState error={err} />

  const items = data?.data?.items || data?.data?.itemsSearch || []
  const cdn = data?.data?.APP_DOMAIN_CDN_IMAGE || ''
  const pagination = data?.data?.params?.pagination

  return (
    <div className="search-page-shell">
      <div className="section-title search-page-header">
        <h2>Kết quả tìm kiếm</h2>
        <div className="search-page-summary muted">
          Từ khóa: <b>{keyword}</b>
        </div>
      </div>
      <MovieGrid cdnBase={cdn} items={items} />
      <Pagination pagination={pagination} />
    </div>
  )
}

