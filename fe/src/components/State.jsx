export function Loading({ label = 'Đang tải...' }) {
  return <div className="panel muted">{label}</div>
}

export function ErrorState({ error }) {
  const msg = error?.message || 'Có lỗi xảy ra.'
  return (
    <div className="panel">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Lỗi</div>
      <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
        {msg}
      </div>
    </div>
  )
}

