import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { ErrorState, Loading } from '../components/State.jsx'

export function CategoriesPage() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ophimApi
      .categories()
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

  if (loading) return <Loading label="Đang tải danh sách thể loại..." />
  if (err) return <ErrorState error={err} />

  const items = data?.data?.items || data?.data || []

  return (
    <>
      <div className="section-title">
        <h1>Thể loại</h1>
        <div className="muted">{items.length} thể loại</div>
      </div>

      <div className="panel">
        <div className="kvs">
          {items.map((it) => (
            <Link key={it.id || it.slug} className="kv" to={`/the-loai/${it.slug}`}>
              {it.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

