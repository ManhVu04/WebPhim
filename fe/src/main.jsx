import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { PrerenderDataProvider } from './lib/prerenderData.jsx'

// Remove the previous cache-first worker so API and media cannot stay stale.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => {})
}
if ('caches' in window) {
  caches.keys()
    .then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('webphim-')).map((key) => caches.delete(key)),
    ))
    .catch(() => {})
}

const root = document.getElementById('root')
const app = (
  <StrictMode>
    <BrowserRouter>
      <PrerenderDataProvider initialData={window.__WEBPHIM_PRERENDER_DATA__ || {}}>
        <App />
      </PrerenderDataProvider>
    </BrowserRouter>
  </StrictMode>
)

if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
