import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="panel muted" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>404</h1>
      <p style={{ fontSize: '1.1rem', margin: '1rem 0 1.5rem' }}>
        Trang bạn tìm kiếm không tồn tại.
      </p>
      <Link className="btnPrimary" to="/">
        Về trang chủ
      </Link>
    </div>
  )
}
