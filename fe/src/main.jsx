import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
