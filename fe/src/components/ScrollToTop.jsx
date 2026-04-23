import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scrolls to top whenever the route pathname changes.
 * Place inside <BrowserRouter> (e.g. in App or Layout).
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
