import { buildPosterUrl, buildThumbUrl } from './image.js'

export const DEFAULT_SEO = {
  title: 'WebPhim - Xem phim online',
  description: 'WebPhim - Xem phim online miễn phí, cập nhật phim mới nhanh nhất với chất lượng HD, Vietsub.',
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value, max = 160) {
  const text = stripHtml(value)
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function getPage(url, siteUrl) {
  const parsed = new URL(url, siteUrl)
  return Math.max(1, Number(parsed.searchParams.get('page') || 1))
}

function canonicalUrl(url, siteUrl) {
  const parsed = new URL(url, siteUrl)
  if (parsed.searchParams.get('page') === '1') parsed.searchParams.delete('page')
  parsed.hash = ''
  return parsed.toString()
}

function absoluteUrl(siteUrl, value) {
  if (!value) return ''
  try {
    return new URL(value, siteUrl).toString()
  } catch {
    return ''
  }
}

export function selectPrerenderData(url = '/', data = {}) {
  const parsed = new URL(url, 'http://localhost')
  const path = parsed.pathname.replace(/\/$/, '') || '/'
  const page = Math.max(1, Number(parsed.searchParams.get('page') || 1))
  const selected = {}

  const include = (key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) selected[key] = data[key]
  }

  if (path === '/') {
    include('home')
    for (const key of Object.keys(data)) {
      if (/^list:[^:]+:1$/.test(key)) include(key)
    }
    return selected
  }

  const movieMatch = path.match(/^\/phim\/([^/]+)$/)
  if (movieMatch) {
    const slug = decodeURIComponent(movieMatch[1])
    include(`movie:${slug}`)
    include(`movie-people:${slug}`)
    include('list:phim-moi:1')
    return selected
  }

  const listMatch = path.match(/^\/danh-sach\/([^/]+)$/)
  if (listMatch) {
    include(`list:${decodeURIComponent(listMatch[1])}:${page}`)
    return selected
  }

  const categoryMatch = path.match(/^\/the-loai\/([^/]+)$/)
  if (categoryMatch) {
    include(`cat:${decodeURIComponent(categoryMatch[1])}:${page}`)
  }

  return selected
}

function listSeo(data) {
  const pageSeo = data?.data?.seoOnPage || {}
  const cdn = data?.data?.APP_DOMAIN_CDN_IMAGE || data?.data?.APP_DOMAIN_CDN || ''
  const firstImage = Array.isArray(pageSeo.og_image) ? pageSeo.og_image[0] : pageSeo.og_image
  const image = firstImage ? buildThumbUrl(cdn, firstImage) : ''
  return {
    title: pageSeo.titleHead || data?.data?.titlePage || DEFAULT_SEO.title,
    description: pageSeo.descriptionHead || DEFAULT_SEO.description,
    type: pageSeo.og_type || 'website',
    image,
  }
}

function movieSeo(data, peopleData, siteUrl) {
  const payload = data?.data || data || {}
  const item = payload.item || payload.data?.item || payload
  const cdn = payload.APP_DOMAIN_CDN_IMAGE || payload.APP_DOMAIN_CDN || ''
  const title = item?.name || item?.origin_name || DEFAULT_SEO.title
  const image = buildPosterUrl(cdn, item?.poster_url, item?.thumb_url)
  const people = peopleData?.data?.peoples || []
  const actors = people
    .filter((p) => String(p.known_for_department || '').toLowerCase() === 'acting')
    .slice(0, 8)
    .map((p) => ({ '@type': 'Person', name: p.name }))
  const directors = people
    .filter((p) => String(p.known_for_department || '').toLowerCase() === 'directing')
    .slice(0, 4)
    .map((p) => ({ '@type': 'Person', name: p.name }))
  const rating = item?.tmdb?.vote_count > 0 && item?.tmdb?.vote_average
    ? {
        '@type': 'AggregateRating',
        ratingValue: Number(item.tmdb.vote_average),
        ratingCount: Number(item.tmdb.vote_count),
        bestRating: 10,
      }
    : undefined

  return {
    title: `${title} - Xem phim Vietsub HD | WebPhim`,
    description: truncate(item?.content || `${title} Vietsub HD, xem phim online tại WebPhim.`),
    type: 'video.movie',
    image,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: title,
      alternateName: item?.origin_name || undefined,
      description: truncate(item?.content || '', 500),
      image: absoluteUrl(siteUrl, image),
      datePublished: item?.year ? String(item.year) : undefined,
      actor: actors.length ? actors : undefined,
      director: directors.length ? directors : undefined,
      aggregateRating: rating,
    },
  }
}

export function buildSeo({ url = '/', data = {}, siteUrl = 'http://localhost:5173' }) {
  const parsed = new URL(url, siteUrl)
  const path = parsed.pathname.replace(/\/$/, '') || '/'
  const page = getPage(url, siteUrl)
  let seo = { ...DEFAULT_SEO, type: 'website', image: '' }

  if (path === '/') {
    seo = listSeo(data.home, siteUrl)
  } else {
    const movieMatch = path.match(/^\/phim\/([^/]+)$/)
    const listMatch = path.match(/^\/danh-sach\/([^/]+)$/)
    const categoryMatch = path.match(/^\/the-loai\/([^/]+)$/)
    if (movieMatch) {
      const slug = decodeURIComponent(movieMatch[1])
      seo = movieSeo(data[`movie:${slug}`], data[`movie-people:${slug}`], siteUrl)
    } else if (listMatch) {
      seo = listSeo(data[`list:${decodeURIComponent(listMatch[1])}:${page}`], siteUrl)
    } else if (categoryMatch) {
      seo = listSeo(data[`cat:${decodeURIComponent(categoryMatch[1])}:${page}`], siteUrl)
    }
  }

  return {
    title: seo.title || DEFAULT_SEO.title,
    description: seo.description || DEFAULT_SEO.description,
    canonical: canonicalUrl(url, siteUrl),
    type: seo.type || 'website',
    image: absoluteUrl(siteUrl, seo.image),
    jsonLd: seo.jsonLd,
  }
}

export function buildHeadTags(args) {
  const seo = buildSeo(args)
  const tags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`,
    `<meta property="og:type" content="${escapeHtml(seo.type)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.canonical)}" />`,
    seo.image ? `<meta property="og:image" content="${escapeHtml(seo.image)}" />` : '',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    seo.image ? `<meta name="twitter:image" content="${escapeHtml(seo.image)}" />` : '',
    seo.jsonLd ? `<script type="application/ld+json">${escapeScriptJson(seo.jsonLd)}</script>` : '',
  ]
  return tags.filter(Boolean).join('\n    ')
}

export function buildPrerenderDataScript(data) {
  return `<script>window.__WEBPHIM_PRERENDER_DATA__=${escapeScriptJson(data)}</script>`
}
