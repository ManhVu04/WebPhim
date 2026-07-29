import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { cacheKeys, ophimApi } from '../lib/api.js'
import { usePrerenderData } from '../lib/prerenderData.jsx'
import { MovieGrid } from '../components/MovieGrid.jsx'
import { ErrorState, Loading } from '../components/State.jsx'
import { Pagination } from '../components/Pagination.jsx'
import { useSeoHead } from '../lib/useSeoHead.js'
import { buildSeo } from '../lib/seo.js'
import { buildPublicPagePath, normalizePage } from '../lib/paginationRoutes.js'

export function ListByYearPage() {
  const { year, page: routePage } = useParams()
  const [params] = useSearchParams()
  const page = normalizePage(routePage || params.get('page'))
  const prerenderData = usePrerenderData()
  const initialData = prerenderData[cacheKeys.year(year, page)]
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
      .year(year, page)
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
  }, [year, page, initialData])

  const items = useMemo(() => data?.data?.items || [], [data])
  const cdn = data?.data?.APP_DOMAIN_CDN_IMAGE || ''
  const title = data?.data?.titlePage || `Năm ${year}`
  const pagination = data?.data?.params?.pagination

  const seo = useMemo(() => buildSeo({
    url: buildPublicPagePath(`/nam-phat-hanh/${year}`, page),
    siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    data: data ? { [cacheKeys.year(year, page)]: data } : {},
  }), [data, page, year])

  useSeoHead({
    title: seo.title,
    description: seo.description,
    type: seo.type,
    image: seo.image,
    jsonLd: seo.itemList,
  })

  if (loading) return <Loading label="Đang tải phim theo năm..." />
  if (err) return <ErrorState error={err} />

  return (
    <>
      <div className="section-title">
        <h1>{title}</h1>
        <div className="muted">{items.length} phim</div>
      </div>
      <MovieGrid cdnBase={cdn} items={items} />
      <Pagination pagination={pagination} mode="path" />
    </>
  )
}
