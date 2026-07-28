import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_SEO } from '../lib/seo.js'

const ROUTE_TITLES = {
  '/': 'WebPhim - Xem phim online',
  '/dang-nhap': 'Đăng nhập - WebPhim',
  '/dang-ky': 'Đăng ký - WebPhim',
  '/quen-mat-khau': 'Quên mật khẩu - WebPhim',
  '/the-loai': 'Thể loại phim - WebPhim',
  '/quoc-gia': 'Quốc gia - WebPhim',
  '/nam-phat-hanh': 'Năm phát hành - WebPhim',
  '/yeu-thich': 'Phim yêu thích - WebPhim',
  '/lich-su': 'Lịch sử xem phim - WebPhim',
  '/tim-kiem': 'Tìm kiếm - WebPhim',
}

export function useSeoTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Exact match first, then prefix match
    const title = ROUTE_TITLES[pathname] || routeTitleFromPath(pathname) || DEFAULT_SEO.title
    document.title = title
  }, [pathname])
}

function routeTitleFromPath(path) {
  // /phim/:slug → movie name set by SSR, keep fallback
  if (path.startsWith('/phim/')) return DEFAULT_SEO.title
  // /danh-sach/xxx → list page
  if (path.startsWith('/danh-sach/')) return DEFAULT_SEO.title
  // /the-loai/xxx, /quoc-gia/xxx → filter pages
  if (path.startsWith('/the-loai/') || path.startsWith('/quoc-gia/')) return DEFAULT_SEO.title
  // /nam-phat-hanh/YYYY → year pages
  if (path.startsWith('/nam-phat-hanh/')) return DEFAULT_SEO.title
  // /tai-khoan/xxx
  if (path.startsWith('/tai-khoan/')) return 'Tài khoản - WebPhim'
  // /xem/xxx → watch page
  if (path.startsWith('/xem/')) return DEFAULT_SEO.title
  return null
}
