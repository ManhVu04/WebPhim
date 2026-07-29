import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cacheKeys, ophimApi } from '../lib/api.js'
import { ErrorState, Loading } from '../components/State.jsx'
import { useSeoHead } from '../lib/useSeoHead.js'
import { usePrerenderData } from '../lib/prerenderData.jsx'

export function CountriesPage() {
  const prerenderData = usePrerenderData()
  const initialData = prerenderData[cacheKeys.countries()] || null
  const [data, setData] = useState(initialData)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(!initialData)

  useSeoHead({
    title: 'Quốc gia - WebPhim',
    description: 'Danh sách phim theo quốc gia: Hàn Quốc, Trung Quốc, Nhật Bản, Mỹ, Thái Lan và nhiều hơn nữa tại WebPhim.',
  })

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
      .countries()
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
  }, [initialData])

  if (loading) return <Loading label="Đang tải danh sách quốc gia..." />
  if (err) return <ErrorState error={err} />

  const items = data?.data?.items || data?.data || []

  return (
    <>
      <div className="section-title">
        <h1>Quốc gia</h1>
        <div className="muted">{items.length} quốc gia</div>
      </div>

      <div className="panel">
        <div className="kvs">
          {items.map((it) => (
            <Link key={it.id || it.slug} className="kv" to={`/quoc-gia/${it.slug}`}>
              {it.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
