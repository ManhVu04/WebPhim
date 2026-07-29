import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_SEO,
  canonicalUrl,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  robotsContent,
} from './seo.js'

const SITE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL) || 'http://localhost:5173'

/**
 * Manages `<head>` tags for client-side SPA navigation.
 *
 * On SSR-prerendered pages the initial tags are already in the HTML.
 * This hook updates them when the user navigates client-side.
 *
 * @param {{
 *   title?: string,
 *   description?: string,
 *   canonical?: string,
 *   robots?: string,
 *   type?: string,
 *   image?: string,
 *   jsonLd?: object|object[]
 * }} opts
 */
export function useSeoHead(opts = {}) {
  const { pathname, search } = useLocation()
  const managedScriptsRef = useRef([])

  const title = opts.title || DEFAULT_SEO.title
  const description = opts.description || DEFAULT_SEO.description
  const canonical = opts.canonical || canonicalUrl(pathname + search, SITE_URL)
  const robots = opts.robots || robotsContent(pathname)
  const type = opts.type || 'website'
  const image = opts.image || ''

  useEffect(() => {
    // Title
    document.title = title

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', description)

    setMetaName('robots', robots)

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute('href', canonical)

    for (const alternate of document.querySelectorAll('link[rel="alternate"][hreflang]')) {
      alternate.remove()
    }

    // OG tags
    setMetaProperty('og:type', type)
    setMetaProperty('og:title', title)
    setMetaProperty('og:description', description)
    setMetaProperty('og:url', canonical)
    setMetaProperty('og:site_name', 'WebPhim')
    setMetaProperty('og:locale', 'vi_VN')
    setMetaProperty('og:image', image)
    setMetaName('twitter:card', 'summary_large_image')
    setMetaName('twitter:title', title)
    setMetaName('twitter:description', description)
    setMetaName('twitter:image', image)

    // Remove SSR JSON-LD scripts (data-ssr) to prevent duplicates
    for (const script of document.head.querySelectorAll('script[data-ssr]')) {
      script.remove()
    }

    // Remove previously client-injected JSON-LD scripts
    for (const script of managedScriptsRef.current) {
      script.remove()
    }
    managedScriptsRef.current = []

    // Inject JSON-LD scripts
    const jsonLdItems = Array.isArray(opts.jsonLd) ? [...opts.jsonLd] : opts.jsonLd ? [opts.jsonLd] : []

    // Always add Organization
    const base = SITE_URL.replace(/\/$/, '')
    jsonLdItems.unshift(buildOrganizationJsonLd(base))

    // Add WebSite on homepage
    if (pathname === '/' || pathname === '') {
      jsonLdItems.push(buildWebSiteJsonLd(base))
    }

    for (const ld of jsonLdItems) {
      if (!ld) continue
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(ld)
      document.head.appendChild(script)
      managedScriptsRef.current.push(script)
    }

    // Cleanup on unmount or re-run
    return () => {
      for (const script of managedScriptsRef.current) {
        script.remove()
      }
      managedScriptsRef.current = []
    }
  }, [title, description, canonical, robots, type, image, pathname, opts.jsonLd])
}

function setMetaProperty(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`)
  if (!content) {
    meta?.remove()
    return
  }
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

function setMetaName(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!content) {
    meta?.remove()
    return
  }
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}
