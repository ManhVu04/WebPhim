import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { SearchOverlay } from './SearchOverlay.jsx'
import { UserMenu } from './UserMenu.jsx'

export function Layout({ theme, onToggleTheme }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initial = params.get('keyword') || params.get('q') || ''
  const [q, setQ] = useState(initial)
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchWrapperRef = useRef(null)
  const [open, setOpen] = useState(null) // 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam' | null
  const [cats, setCats] = useState([])
  const [countries, setCountries] = useState([])
  const [years, setYears] = useState([])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 760) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load menu data when mobile menu opens
  useEffect(() => {
    if (mobileMenuOpen) {
      ensureCats()
      ensureCountries()
      ensureYears()
    }
  }, [mobileMenuOpen])

  // Prevent body scroll when overlays open
  useEffect(() => {
    const isMobileSearchOpen = window.matchMedia('(max-width: 600px)').matches && searchFocused && q.trim()
    if (mobileMenuOpen || isMobileSearchOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen, searchFocused, q])

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
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand" aria-label="Trang chủ">
            <span className="brand-badge" aria-hidden="true" />
            <span>WebPhim</span>
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

          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Mở menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className={`search-wrapper${searchFocused && q.trim() ? ' search-wrapper-active' : ''}`} ref={searchWrapperRef}>
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
            {searchFocused && <SearchOverlay query={q} onClose={closeSearch} containerRef={searchWrapperRef} />}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={`mobile-menu-overlay${mobileMenuOpen ? ' open' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile menu panel */}
      <nav className={`mobile-menu-panel${mobileMenuOpen ? ' open' : ''}`} aria-label="Menu di động">
        <div className="mobile-menu-header">
          <div className="brand" style={{ margin: 0 }}>
            <span className="brand-badge" aria-hidden="true" />
            <span>WebPhim</span>
          </div>
          <button className="mobile-menu-close" onClick={closeMobileMenu} aria-label="Đóng menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="mobile-menu-section">
          <Link to="/" className="mobile-menu-link" onClick={closeMobileMenu}>
            Trang chủ
          </Link>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Danh sách</div>
          <div className="mobile-menu-grid">
            <Link to="/danh-sach/phim-moi?page=1" className="mobile-menu-grid-item" onClick={closeMobileMenu}>
              Phim mới
            </Link>
            <Link to="/danh-sach/phim-le?page=1" className="mobile-menu-grid-item" onClick={closeMobileMenu}>
              Phim lẻ
            </Link>
            <Link to="/danh-sach/phim-bo?page=1" className="mobile-menu-grid-item" onClick={closeMobileMenu}>
              Phim bộ
            </Link>
            <Link to="/danh-sach/hoat-hinh?page=1" className="mobile-menu-grid-item" onClick={closeMobileMenu}>
              Hoạt hình
            </Link>
          </div>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Thể loại</div>
          <div className="mobile-menu-grid">
            {cats.slice(0, 8).map((c) => (
              <Link
                key={c.id || c.slug}
                to={`/the-loai/${c.slug}`}
                className="mobile-menu-grid-item"
                onClick={async () => {
                  if (!cats.length) await ensureCats()
                  closeMobileMenu()
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Quốc gia</div>
          <div className="mobile-menu-grid">
            {countries.slice(0, 8).map((c) => (
              <Link
                key={c.id || c.slug}
                to={`/quoc-gia/${c.slug}`}
                className="mobile-menu-grid-item"
                onClick={async () => {
                  if (!countries.length) await ensureCountries()
                  closeMobileMenu()
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mobile-menu-section">
          <div className="mobile-menu-section-title">Năm phát hành</div>
          <div className="mobile-menu-grid">
            {years.slice(0, 6).map((y) => (
              <Link
                key={y}
                to={`/nam-phat-hanh/${y}?page=1`}
                className="mobile-menu-grid-item"
                onClick={async () => {
                  if (!years.length) await ensureYears()
                  closeMobileMenu()
                }}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="content">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </>
  )
}

