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

export function ListByCountryPage() {
  const { slug, page: routePage } = useParams()
  const [params] = useSearchParams()
  const page = normalizePage(routePage || params.get('page'))
  const prerenderData = usePrerenderData()
  const initialData = prerenderData[cacheKeys.country(slug, page)]
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
      .country(slug, page)
      .then((json) => {
        if (!alive) return
        setData(json)
        setErr(null)
      })
      .catch((e) => alive && setErr(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [slug, page, initialData])

  const items = useMemo(() => data?.data?.items || [], [data])
  const cdn = data?.data?.APP_DOMAIN_CDN_IMAGE || ''
  const title = data?.data?.titlePage || data?.data?.name || slug
  const pagination = data?.data?.params?.pagination

  const seo = useMemo(() => buildSeo({
    url: buildPublicPagePath(`/quoc-gia/${slug}`, page),
    siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    data: data ? { [cacheKeys.country(slug, page)]: data } : {},
  }), [data, page, slug])

  useSeoHead({
    title: seo.title,
    description: seo.description,
    type: seo.type,
    image: seo.image,
    jsonLd: seo.itemList,
  })

  if (loading) return <Loading label="Đang tải phim theo quốc gia..." />
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
