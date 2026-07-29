import './App.css'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { ScrollToTop } from './components/ScrollToTop.jsx'
import { BreadcrumbProvider } from './lib/useBreadcrumb.jsx'
import { Suspense, lazy, useEffect, useState } from 'react'
import { SearchPage } from './pages/SearchPage.jsx'
import { LoginPage } from './pages/auth/LoginPage.jsx'
import { RegisterPage } from './pages/auth/RegisterPage.jsx'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.jsx'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.jsx'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage.jsx'
import { CategoriesPage } from './pages/CategoriesPage.jsx'
import { CountriesPage } from './pages/CountriesPage.jsx'
import { YearsPage } from './pages/YearsPage.jsx'
import { ListByCategoryPage } from './pages/ListByCategoryPage.jsx'
import { ListByCountryPage } from './pages/ListByCountryPage.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { FavoritesPage } from './pages/user/FavoritesPage.jsx'
import { HistoryPage } from './pages/user/HistoryPage.jsx'
import { AccountSecurityPage } from './pages/user/AccountSecurityPage.jsx'
import { ListByYearPage } from './pages/ListByYearPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { ListPage } from './pages/ListPage.jsx'
import { MovieDetailPage } from './pages/MovieDetailPage.jsx'
import { legacyPaginationTarget } from './lib/paginationRoutes.js'
import { useSeoHead } from './lib/useSeoHead.js'

const THEME_KEY = 'webphim_theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore storage errors
  }
  return 'dark'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

const WatchPage = lazy(() => import('./pages/WatchPage.jsx').then((m) => ({ default: m.WatchPage })))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'))

function LegacyPaginationRedirect() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const target = legacyPaginationTarget(pathname, search)
    if (target) navigate(target, { replace: true })
  }, [navigate, pathname, search])

  return null
}

function NoIndexRoute({ children, follow = false }) {
  useSeoHead({ robots: `noindex, ${follow ? 'follow' : 'nofollow'}` })
  return children
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore storage errors
    }
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <AuthProvider>
      <ErrorBoundary>
        <BreadcrumbProvider>
        <LegacyPaginationRedirect />
        <ScrollToTop />
        <Suspense fallback={<div className="panel muted">Đang tải...</div>}>
          <Routes>
            <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
              <Route index element={<HomePage />} />
              <Route path="/dang-nhap" element={<NoIndexRoute><LoginPage /></NoIndexRoute>} />
              <Route path="/dang-ky" element={<NoIndexRoute><RegisterPage /></NoIndexRoute>} />
              <Route path="/quen-mat-khau" element={<NoIndexRoute><ForgotPasswordPage /></NoIndexRoute>} />
              <Route path="/dat-lai-mat-khau" element={<NoIndexRoute><ResetPasswordPage /></NoIndexRoute>} />
              <Route path="/xac-minh-email" element={<NoIndexRoute><VerifyEmailPage /></NoIndexRoute>} />
              <Route path="/tim-kiem" element={<NoIndexRoute follow><SearchPage /></NoIndexRoute>} />
              <Route path="/the-loai" element={<CategoriesPage />} />
              <Route path="/the-loai/:slug" element={<ListByCategoryPage />} />
              <Route path="/the-loai/:slug/trang/:page" element={<ListByCategoryPage />} />
              <Route path="/quoc-gia" element={<CountriesPage />} />
              <Route path="/quoc-gia/:slug" element={<ListByCountryPage />} />
              <Route path="/quoc-gia/:slug/trang/:page" element={<ListByCountryPage />} />
              <Route path="/nam-phat-hanh" element={<YearsPage />} />
              <Route path="/nam-phat-hanh/:year" element={<ListByYearPage />} />
              <Route path="/nam-phat-hanh/:year/trang/:page" element={<ListByYearPage />} />
              <Route path="/danh-sach/:type" element={<ListPage />} />
              <Route path="/danh-sach/:type/trang/:page" element={<ListPage />} />
              <Route path="/phim/:slug" element={<MovieDetailPage />} />
              <Route path="/xem/:slug" element={<NoIndexRoute follow><WatchPage /></NoIndexRoute>} />
              <Route path="/yeu-thich" element={<NoIndexRoute><ProtectedRoute><FavoritesPage /></ProtectedRoute></NoIndexRoute>} />
              <Route path="/lich-su" element={<NoIndexRoute><ProtectedRoute><HistoryPage /></ProtectedRoute></NoIndexRoute>} />
              <Route path="/tai-khoan/bao-mat" element={<NoIndexRoute><ProtectedRoute><AccountSecurityPage /></ProtectedRoute></NoIndexRoute>} />
              <Route path="/admin" element={<NoIndexRoute><ProtectedRoute requireAdmin><AdminDashboardPage /></ProtectedRoute></NoIndexRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
        </BreadcrumbProvider>
      </ErrorBoundary>
    </AuthProvider>
  )
}

export default App
