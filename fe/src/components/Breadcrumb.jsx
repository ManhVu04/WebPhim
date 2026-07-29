import { Link, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useBreadcrumb } from '../lib/useBreadcrumb.jsx'
import './Breadcrumb.css'

const LABELS = {
  '/danh-sach/phim-moi': 'Phim mới',
  '/danh-sach/phim-bo': 'Phim bộ',
  '/danh-sach/phim-le': 'Phim lẻ',
  '/danh-sach/hoat-hinh': 'Hoạt hình',
  '/danh-sach/phim-chieu-rap': 'Phim chiếu rạp',
  '/danh-sach/phim-sap-chieu': 'Phim sắp chiếu',
  '/the-loai': 'Thể loại',
  '/quoc-gia': 'Quốc gia',
  '/nam-phat-hanh': 'Năm phát hành',
  '/tim-kiem': 'Tìm kiếm',
  '/yeu-thich': 'Yêu thích',
  '/lich-su': 'Lịch sử',
}

export function Breadcrumb() {
  const { pathname } = useLocation()
  const ctx = useBreadcrumb()

  const crumbs = useMemo(() => {
    // Page-provided breadcrumb (e.g. movie detail)
    if (ctx?.items) return ctx.items

    const parts = pathname.replace(/\/$/g, '').split('/').filter(Boolean)
    if (!parts.length) return null

    const result = [{ label: 'Trang chủ', to: '/' }]

    let built = ''
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i]
      built += '/' + seg
      const label = LABELS[built]
      if (!label) continue
      const isLast = i === parts.length - 1
      result.push({ label, to: isLast ? null : built })
    }

    return result.length > 1 ? result : null
  }, [pathname, ctx?.items])

  if (!crumbs) return null

  return (
    <nav aria-label="Breadcrumb">
      <ol className="bcrumbs">
        {crumbs.map((crumb, i) => (
          <li key={i}>
            {i > 0 && <span aria-hidden="true">›</span>}
            {crumb.to ? (
              <Link to={crumb.to}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
