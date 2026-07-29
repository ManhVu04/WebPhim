import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { MovieGrid } from '../components/MovieGrid.jsx'
import { ErrorState, Loading } from '../components/State.jsx'
import { Pagination } from '../components/Pagination.jsx'
import { useSeoHead } from '../lib/useSeoHead.js'

export function SearchPage() {
  const [params] = useSearchParams()
  const keyword = useMemo(() => (params.get('keyword') || '').trim(), [params])
  const requestedPage = Number(params.get('page') || 1)
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1

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

  useSeoHead({
    title: keyword
      ? `Tìm kiếm: ${keyword}${page > 1 ? ` - Trang ${page}` : ''} - WebPhim`
      : 'Tìm kiếm phim - WebPhim',
    description: keyword
      ? `Kết quả tìm kiếm phim "${keyword}" tại WebPhim.`
      : 'Tìm kiếm phim theo tên phim tại WebPhim.',
    robots: 'noindex, follow',
    type: 'website',
  })

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
        <h1>Kết quả tìm kiếm</h1>
        <div className="search-page-summary muted">
          Từ khóa: <b>{keyword}</b>
        </div>
      </div>
      <MovieGrid cdnBase={cdn} items={items} />
      <Pagination pagination={pagination} />
    </div>
  )
}
