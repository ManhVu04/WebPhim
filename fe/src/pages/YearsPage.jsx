import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { ErrorState, Loading } from '../components/State.jsx'

export function YearsPage() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

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

