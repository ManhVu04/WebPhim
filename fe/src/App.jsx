import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { ScrollToTop } from './components/ScrollToTop.jsx'
import { Suspense, lazy } from 'react'
import { SearchPage } from './pages/SearchPage.jsx'
import { LoginPage } from './pages/auth/LoginPage.jsx'
import { RegisterPage } from './pages/auth/RegisterPage.jsx'
import { CategoriesPage } from './pages/CategoriesPage.jsx'
import { CountriesPage } from './pages/CountriesPage.jsx'
import { YearsPage } from './pages/YearsPage.jsx'
import { ListByCategoryPage } from './pages/ListByCategoryPage.jsx'
import { ListByCountryPage } from './pages/ListByCountryPage.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { FavoritesPage } from './pages/user/FavoritesPage.jsx'
import { HistoryPage } from './pages/user/HistoryPage.jsx'
import { ListByYearPage } from './pages/ListByYearPage.jsx'

const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage.jsx').then((m) => ({ default: m.MovieDetailPage })))
const WatchPage = lazy(() => import('./pages/WatchPage.jsx').then((m) => ({ default: m.WatchPage })))
const ListPage = lazy(() => import('./pages/ListPage.jsx').then((m) => ({ default: m.ListPage })))

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
      <ScrollToTop />
      <Suspense fallback={<div className="panel muted">Đang tải...</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ListPage />} />
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/tim-kiem" element={<SearchPage />} />
            <Route path="/the-loai" element={<CategoriesPage />} />
            <Route path="/the-loai/:slug" element={<ListByCategoryPage />} />
            <Route path="/quoc-gia" element={<CountriesPage />} />
            <Route path="/quoc-gia/:slug" element={<ListByCountryPage />} />
            <Route path="/nam-phat-hanh" element={<YearsPage />} />
            <Route path="/nam-phat-hanh/:year" element={<ListByYearPage />} />
            <Route path="/danh-sach/:type" element={<ListPage />} />
            <Route path="/phim/:slug" element={<MovieDetailPage />} />
            <Route path="/xem/:slug" element={<WatchPage />} />
            <Route path="/yeu-thich" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/lich-su" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
    </AuthProvider>
  )
}

export default App
