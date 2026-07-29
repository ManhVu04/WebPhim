import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cacheKeys, ophimApi } from '../lib/api.js'
import { ErrorState, Loading } from '../components/State.jsx'
import { useSeoHead } from '../lib/useSeoHead.js'
import { usePrerenderData } from '../lib/prerenderData.jsx'

export function YearsPage() {
  const prerenderData = usePrerenderData()
  const initialData = prerenderData[cacheKeys.years()] || null
  const [data, setData] = useState(initialData)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(!initialData)

  useSeoHead({
    title: 'Năm phát hành - WebPhim',
    description: 'Xem phim theo năm phát hành, từ phim cũ đến phim mới nhất tại WebPhim.',
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
      .years()
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

  if (loading) return <Loading label="Đang tải danh sách năm phát hành..." />
  if (err) return <ErrorState error={err} />

  const items = data?.data?.items || data?.data || []
  const years = items
    .map((it) => (typeof it === 'number' ? it : Number(it?.year ?? it?.name ?? it)))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a)

  return (
    <>
      <div className="section-title">
        <h1>Năm phát hành</h1>
        <div className="muted">{years.length} năm</div>
      </div>

      <div className="panel">
        <div className="kvs">
          {years.map((y) => (
            <Link key={y} className="kv" to={`/nam-phat-hanh/${y}`}>
              {y}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
