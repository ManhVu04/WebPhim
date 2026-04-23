import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { SearchOverlay } from './SearchOverlay.jsx'
import { UserMenu } from './UserMenu.jsx'

export function Layout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initial = params.get('keyword') || params.get('q') || ''
  const [q, setQ] = useState(initial)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchWrapperRef = useRef(null)
  const [open, setOpen] = useState(null) // 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam' | null
  const [cats, setCats] = useState([])
  const [countries, setCountries] = useState([])
  const [years, setYears] = useState([])

  const navItems = useMemo(
    () => [
      { to: '/', label: 'Trang chủ' },
    ],
    [],
  )

  async function ensureCats() {
    if (cats.length) return
    const json = await ophimApi.categories()
    setCats(json?.data?.items || json?.data || [])
  }

  async function ensureCountries() {
    if (countries.length) return
    const json = await ophimApi.countries()
    setCountries(json?.data?.items || json?.data || [])
  }

  async function ensureYears() {
    if (years.length) return
    const json = await ophimApi.years()
    const items = json?.data?.items || json?.data || []
    const ys = items
      .map((it) => (typeof it === 'number' ? it : Number(it?.year ?? it?.name ?? it)))
      .filter((y) => Number.isFinite(y))
      .sort((x, y) => y - x)
    setYears(ys)
  }

  function onSubmit(e) {
    e.preventDefault()
    const keyword = q.trim()
    if (keyword) {
      navigate(`/tim-kiem?keyword=${encodeURIComponent(keyword)}`)
      setSearchFocused(false)
    }
  }

  const closeSearch = useCallback(() => setSearchFocused(false), [])

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand" aria-label="Trang chủ">
            <span className="brand-badge" aria-hidden="true" />
            WebPhim
          </NavLink>

          <nav className="nav" aria-label="Điều hướng">
            {navItems.map((it) => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => `chip${isActive ? ' active' : ''}`}>
                {it.label}
              </NavLink>
            ))}

            <div className="dropdown">
              <button
                type="button"
                className={`chip${open === 'danh-sach' ? ' active' : ''}`}
                onClick={() => setOpen((v) => (v === 'danh-sach' ? null : 'danh-sach'))}
              >
                Danh sách
              </button>
              {open === 'danh-sach' ? (
                <div className="dropdownPanel" onMouseLeave={() => setOpen(null)}>
                  <Link className="dropdownItem" to="/danh-sach/phim-moi?page=1">
                    Phim mới
                  </Link>
                  <Link className="dropdownItem" to="/danh-sach/phim-le?page=1">
                    Phim lẻ
                  </Link>
                  <Link className="dropdownItem" to="/danh-sach/phim-bo?page=1">
                    Phim bộ
                  </Link>
                  <Link className="dropdownItem" to="/danh-sach/hoat-hinh?page=1">
                    Hoạt hình
                  </Link>
                  <Link className="dropdownItem" to="/danh-sach/tv-shows?page=1">
                    TV Shows
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="dropdown">
              <button
                type="button"
                className={`chip${open === 'the-loai' ? ' active' : ''}`}
                onClick={async () => {
                  const next = open === 'the-loai' ? null : 'the-loai'
                  setOpen(next)
                  if (next) await ensureCats()
                }}
              >
                Thể loại
              </button>
              {open === 'the-loai' ? (
                <div className="dropdownPanel" onMouseLeave={() => setOpen(null)}>
                  {cats.map((c) => (
                    <Link key={c.id || c.slug} className="dropdownItem" to={`/the-loai/${c.slug}`}>
                      {c.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="dropdown">
              <button
                type="button"
                className={`chip${open === 'quoc-gia' ? ' active' : ''}`}
                onClick={async () => {
                  const next = open === 'quoc-gia' ? null : 'quoc-gia'
                  setOpen(next)
                  if (next) await ensureCountries()
                }}
              >
                Quốc gia
              </button>
              {open === 'quoc-gia' ? (
                <div className="dropdownPanel" onMouseLeave={() => setOpen(null)}>
                  {countries.map((c) => (
                    <Link key={c.id || c.slug} className="dropdownItem" to={`/quoc-gia/${c.slug}`}>
                      {c.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="dropdown">
              <button
                type="button"
                className={`chip${open === 'nam' ? ' active' : ''}`}
                onClick={async () => {
                  const next = open === 'nam' ? null : 'nam'
                  setOpen(next)
                  if (next) await ensureYears()
                }}
              >
                Năm
              </button>
              {open === 'nam' ? (
                <div className="dropdownPanel dropdownPanelYears" onMouseLeave={() => setOpen(null)}>
                  {years.slice(0, 60).map((y) => (
                    <Link key={y} className="dropdownItem" to={`/nam-phat-hanh/${y}?page=1`}>
                      {y}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="search-wrapper" ref={searchWrapperRef}>
            <form className="search" onSubmit={onSubmit} role="search">
              <span className="search-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setSearchFocused(true) }}
                onFocus={() => setSearchFocused(true)}
                placeholder="Tìm phim theo từ khóa..."
                aria-label="Tìm phim"
              />
              {q && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => { setQ(''); setSearchFocused(false) }}
                  aria-label="Xóa"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </form>
            {searchFocused && <SearchOverlay query={q} onClose={closeSearch} />}
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="content">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </>
  )
}

