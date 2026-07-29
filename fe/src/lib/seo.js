import { buildPosterUrl, buildThumbUrl } from './image.js'
import { buildPublicPagePath, pageFromUrl, publicPaginationBase } from './paginationRoutes.js'

export const DEFAULT_SEO = {
  title: 'WebPhim - Xem phim online',
  description: 'WebPhim - Xem phim online miễn phí, cập nhật phim mới nhanh nhất với chất lượng HD, Vietsub.',
}

const NOINDEX_PATHS = new Set([
  '/dang-nhap', '/dang-ky', '/quen-mat-khau', '/dat-lai-mat-khau', '/xac-minh-email',
  '/yeu-thich', '/lich-su',
  '/tim-kiem',
  '/admin',
])

export function isNoindex(path) {
  if (NOINDEX_PATHS.has(path)) return true
  if (path.startsWith('/tai-khoan/')) return true
  if (path.startsWith('/xem/')) return true
  return false
}

export function robotsContent(path) {
  if (!isNoindex(path)) {
    return 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  }
  if (path.startsWith('/xem/') || path === '/tim-kiem') return 'noindex, follow'
  return 'noindex, nofollow'
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value, max = 160) {
  const text = stripHtml(value)
  return text.length > max ? text.slice(0, max - 1).trim() + '...' : text
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/** Simple BCP 47 map for known Vietnamese media labels. */
const LANG_MAP = {
  vietsub: 'vi',
  'thuyết minh': 'vi',
  'thuyet minh': 'vi',
  'lồng tiếng': 'vi',
  'long tieng': 'vi',
  english: 'en',
  'tiếng anh': 'en',
  'tieng anh': 'en',
  japanese: 'ja',
  'tiếng nhật': 'ja',
  'tieng nhat': 'ja',
  korean: 'ko',
  'tiếng hàn': 'ko',
  'tieng han': 'ko',
  chinese: 'zh',
  'tiếng trung': 'zh',
  'tieng trung': 'zh',
}
export function mapLanguage(lang) {
  if (!lang) return undefined
  const key = String(lang).trim().toLowerCase()
  return LANG_MAP[key] || undefined
}

function getPage(url, siteUrl) {
  return pageFromUrl(url, siteUrl)
}

/**
 * Build canonical URL.
 * - Strips page=1
 * - Strips non-SEO params (server, ep, etc.)
 * - /xem/:slug → /phim/:slug  (watch page canonicalizes to detail)
 */
export function canonicalUrl(url, siteUrl) {
  const parsed = new URL(url, siteUrl)
  const path = parsed.pathname.replace(/\/+$/, '') || '/'

  if (/^\/xem\/[^/]+$/.test(path)) {
    parsed.pathname = path
  } else {
    const base = publicPaginationBase(path)
    if (base !== path || /^\/(?:danh-sach|the-loai|quoc-gia|nam-phat-hanh)\//.test(path)) {
      parsed.pathname = buildPublicPagePath(base, pageFromUrl(parsed.toString(), siteUrl))
    } else {
      parsed.pathname = path
    }
  }

  parsed.search = ''
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

function prevNextUrl(url, siteUrl, page, totalPages) {
  if (!totalPages || totalPages <= 1) return { prev: null, next: null }
  const base = String(siteUrl).replace(/\/$/, '')
  const makeUrl = (p) => {
    const parsed = new URL(url, base)
    return new URL(buildPublicPagePath(parsed.pathname, p), base).toString()
  }
  return {
    prev: page > 1 ? makeUrl(page - 1) : null,
    next: page < totalPages ? makeUrl(page + 1) : null,
  }
}

function getPagination(data) {
  const pagination = data?.data?.params?.pagination
  if (!pagination?.pageCount) return null
  return {
    currentPage: Math.max(1, Number(pagination.currentPage || 1)),
    totalPages: Number(pagination.pageCount),
  }
}

// ---------------------------------------------------------------------------
// Structured Data Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Vietnamese duration strings like "120 phút", "2h 30m", "45 Phút"
 * into ISO 8601 duration (e.g. "PT120M").
 */
export function parseDuration(timeStr) {
  if (!timeStr) return undefined
  const text = String(timeStr).trim().toLowerCase()

  // "120 phút" / "120 phut" / "120 min" / "120m"
  const minuteMatch = text.match(/^(\d+)\s*(?:phút|phut|min(?:utes?)?|m)$/i)
  if (minuteMatch) return `PT${minuteMatch[1]}M`

  // "2h 30m" / "2h30m"
  const hmMatch = text.match(/^(\d+)\s*h\s*(\d+)\s*m?$/i)
  if (hmMatch) return `PT${hmMatch[1]}H${hmMatch[2]}M`

  // "2h"
  const hMatch = text.match(/^(\d+)\s*h$/i)
  if (hMatch) return `PT${hMatch[1]}H`

  // Plain number → assume minutes
  const plainNum = text.match(/^(\d+)$/)
  if (plainNum) return `PT${plainNum[1]}M`

  return undefined
}

/**
 * BreadcrumbList JSON-LD for movie detail pages.
 */
export function buildBreadcrumbJsonLd(item, siteUrl) {
  if (!item?.name) return undefined
  const base = String(siteUrl).replace(/\/$/, '')
  const elements = [
    { '@type': 'ListItem', position: 1, name: 'Trang ch\u1ee7', item: base + '/' },
  ]
  const cat = Array.isArray(item.category) ? item.category[0] : null
  if (cat?.name && cat?.slug && item.slug) {
    elements.push({
      '@type': 'ListItem', position: 2, name: cat.name, item: base + '/the-loai/' + cat.slug,
    })
    elements.push({
      '@type': 'ListItem', position: 3, name: item.name, item: base + '/phim/' + item.slug,
    })
  } else if (item.slug && item.name) {
    elements.push({
      '@type': 'ListItem', position: 2, name: item.name, item: base + '/phim/' + item.slug,
    })
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: elements }
}

/**
 * Organization JSON-LD — emitted on every page.
 */
export function buildOrganizationJsonLd(siteUrl) {
  const base = String(siteUrl).replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WebPhim',
    url: base + '/',
    logo: base + '/favicon.svg',
  }
}

/**
 * WebSite JSON-LD — emitted on homepage only.
 */
export function buildWebSiteJsonLd(siteUrl) {
  const base = String(siteUrl).replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'WebPhim',
    url: base + '/',
  }
}

/**
 * ItemList JSON-LD for list / category / country / year pages.
 */
export function buildItemListJsonLd(items, siteUrl) {
  if (!Array.isArray(items) || !items.length) return undefined
  const base = String(siteUrl).replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.filter((movie) => movie?.slug).map((movie, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: base + '/phim/' + movie.slug,
    })),
  }
}

// ---------------------------------------------------------------------------
// Route-specific SEO builders
// ---------------------------------------------------------------------------

export function selectPrerenderData(url = '/', data = {}) {
  const parsed = new URL(url, 'http://localhost')
  const path = parsed.pathname.replace(/\/$/, '') || '/'
  const page = pageFromUrl(parsed.toString())
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
  if (path === '/the-loai') {
    include('categories')
    return selected
  }
  if (path === '/quoc-gia') {
    include('countries')
    return selected
  }
  if (path === '/nam-phat-hanh') {
    include('years')
    return selected
  }
  const movieMatch = path.match(/^\/phim\/([^/]+)$/)
  if (movieMatch) {
    const slug = decodeURIComponent(movieMatch[1])
    include('movie:' + slug)
    include('movie-people:' + slug)
    include('list:phim-moi:1')
    return selected
  }
  const listMatch = path.match(/^\/danh-sach\/([^/]+)(?:\/trang\/\d+)?$/)
  if (listMatch) {
    include('list:' + decodeURIComponent(listMatch[1]) + ':' + page)
    return selected
  }
  const categoryMatch = path.match(/^\/the-loai\/([^/]+)(?:\/trang\/\d+)?$/)
  if (categoryMatch) {
    include('cat:' + decodeURIComponent(categoryMatch[1]) + ':' + page)
  }
  const countryMatch = path.match(/^\/quoc-gia\/([^/]+)(?:\/trang\/\d+)?$/)
  if (countryMatch) {
    include('country:' + decodeURIComponent(countryMatch[1]) + ':' + page)
  }
  const yearMatch = path.match(/^\/nam-phat-hanh\/(\d+)(?:\/trang\/\d+)?$/)
  if (yearMatch) {
    include('year:' + yearMatch[1] + ':' + page)
  }
  return selected
}

function listSeo(data, siteUrl) {
  const pageSeo = data?.data?.seoOnPage || {}
  const cdn = data?.data?.APP_DOMAIN_CDN_IMAGE || data?.data?.APP_DOMAIN_CDN || ''
  const firstImage = Array.isArray(pageSeo.og_image) ? pageSeo.og_image[0] : pageSeo.og_image
  const image = firstImage ? buildThumbUrl(cdn, firstImage) : ''

  // Build ItemList JSON-LD from items
  const items = data?.data?.items || []
  const itemList = buildItemListJsonLd(items, siteUrl)

  return {
    title: pageSeo.titleHead || data?.data?.titlePage || DEFAULT_SEO.title,
    description: pageSeo.descriptionHead || DEFAULT_SEO.description,
    type: pageSeo.og_type || 'website',
    image,
    itemList,
  }
}

function positiveInteger(value) {
  const match = String(value ?? '').match(/\d+/)
  const parsed = match ? Number(match[0]) : NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function buildMediaJsonLd(item, peopleData, siteUrl, image) {
  if (!item?.name && !item?.origin_name) return undefined
  const base = String(siteUrl).replace(/\/$/, '')
  const title = item.name || item.origin_name
  const movieUrl = item.slug ? base + '/phim/' + item.slug : undefined
  const people = peopleData?.data?.peoples || []
  const actors = people
    .filter((person) => String(person.known_for_department || '').toLowerCase() === 'acting')
    .slice(0, 8)
    .map((person) => ({ '@type': 'Person', name: person.name }))
  const directors = people
    .filter((person) => String(person.known_for_department || '').toLowerCase() === 'directing')
    .slice(0, 4)
    .map((person) => ({ '@type': 'Person', name: person.name }))
  const rating = item.tmdb?.vote_count > 0 && item.tmdb?.vote_average
    ? {
        '@type': 'AggregateRating',
        ratingValue: Number(item.tmdb.vote_average),
        ratingCount: Number(item.tmdb.vote_count),
        bestRating: 10,
      }
    : undefined
  const genres = Array.isArray(item.category)
    ? item.category.map((category) => (typeof category === 'string' ? category : category?.name)).filter(Boolean)
    : undefined
  const countries = Array.isArray(item.country)
    ? item.country.map((country) => (typeof country === 'string' ? country : country?.name)).filter(Boolean)
    : undefined
  const mediaType = ['series', 'tvshows'].includes(String(item.type || '').toLowerCase())
    ? 'TVSeries'
    : 'Movie'

  return {
    '@context': 'https://schema.org',
    '@type': mediaType,
    '@id': movieUrl,
    name: title,
    alternateName: item.origin_name || undefined,
    url: movieUrl,
    description: truncate(item.content || '', 500),
    image: absoluteUrl(siteUrl, image),
    dateCreated: item.year ? String(item.year) : undefined,
    genre: genres?.length ? genres : undefined,
    countryOfOrigin: countries?.length
      ? countries.map((country) => ({ '@type': 'Country', name: country }))
      : undefined,
    inLanguage: mapLanguage(item.lang),
    duration: mediaType === 'Movie' ? parseDuration(item.time) : undefined,
    numberOfEpisodes: mediaType === 'TVSeries' ? positiveInteger(item.episode_total) : undefined,
    actor: actors.length ? actors : undefined,
    director: directors.length ? directors : undefined,
    aggregateRating: rating,
  }
}

function movieSeo(data, peopleData, siteUrl) {
  const payload = data?.data || data || {}
  const item = payload.item || payload.data?.item || payload
  const cdn = payload.APP_DOMAIN_CDN_IMAGE || payload.APP_DOMAIN_CDN || ''
  const title = item?.name || item?.origin_name || DEFAULT_SEO.title
  const image = buildPosterUrl(cdn, item?.poster_url, item?.thumb_url)
  const mediaJsonLd = buildMediaJsonLd(item, peopleData, siteUrl, image)

  return {
    title: title + ' - Xem phim Vietsub HD | WebPhim',
    description: truncate(item?.content || title + ' Vietsub HD, xem phim online t\u1ea1i WebPhim.'),
    type: 'video.movie',
    image,
    jsonLd: mediaJsonLd,
    breadcrumb: buildBreadcrumbJsonLd(item, siteUrl),
  }
}

export function buildSeo({ url = '/', data = {}, siteUrl = 'http://localhost:5173' }) {
  const parsed = new URL(url, siteUrl)
  const path = parsed.pathname.replace(/\/$/, '') || '/'
  const page = getPage(url, siteUrl)
  let seo = { ...DEFAULT_SEO, type: 'website', image: '' }
  let pagination = null
  if (path === '/') {
    seo = listSeo(data.home, siteUrl)
  } else if (path === '/the-loai') {
    seo = {
      title: 'Thể loại phim - WebPhim',
      description: 'Danh sách thể loại phim mới và phổ biến tại WebPhim.',
      type: 'website',
      image: '',
    }
  } else if (path === '/quoc-gia') {
    seo = {
      title: 'Phim theo quốc gia - WebPhim',
      description: 'Khám phá phim theo quốc gia sản xuất tại WebPhim.',
      type: 'website',
      image: '',
    }
  } else if (path === '/nam-phat-hanh') {
    seo = {
      title: 'Phim theo năm phát hành - WebPhim',
      description: 'Tìm phim theo năm phát hành tại WebPhim.',
      type: 'website',
      image: '',
    }
  } else {
    const movieMatch = path.match(/^\/phim\/([^/]+)$/)
    const listMatch = path.match(/^\/danh-sach\/([^/]+)(?:\/trang\/\d+)?$/)
    const categoryMatch = path.match(/^\/the-loai\/([^/]+)(?:\/trang\/\d+)?$/)
    const countryMatch = path.match(/^\/quoc-gia\/([^/]+)(?:\/trang\/\d+)?$/)
    const yearMatch = path.match(/^\/nam-phat-hanh\/(\d+)(?:\/trang\/\d+)?$/)
    if (movieMatch) {
      const slug = decodeURIComponent(movieMatch[1])
      const movieData = data['movie:' + slug]
      seo = movieSeo(movieData, data['movie-people:' + slug], siteUrl)
    } else if (listMatch) {
      const listData = data['list:' + decodeURIComponent(listMatch[1]) + ':' + page]
      seo = listSeo(listData, siteUrl)
      pagination = getPagination(listData)
    } else if (categoryMatch) {
      const catData = data['cat:' + decodeURIComponent(categoryMatch[1]) + ':' + page]
      seo = listSeo(catData, siteUrl)
      pagination = getPagination(catData)
    } else if (countryMatch) {
      const countryData = data['country:' + decodeURIComponent(countryMatch[1]) + ':' + page]
      seo = listSeo(countryData, siteUrl)
      pagination = getPagination(countryData)
    } else if (yearMatch) {
      const yearData = data['year:' + yearMatch[1] + ':' + page]
      seo = listSeo(yearData, siteUrl)
      pagination = getPagination(yearData)
    }
  }
  const pn = prevNextUrl(url, siteUrl, page, pagination?.totalPages ?? 0)
  return {
    title: seo.title || DEFAULT_SEO.title,
    description: seo.description || DEFAULT_SEO.description,
    canonical: canonicalUrl(url, siteUrl),
    type: seo.type || 'website',
    image: absoluteUrl(siteUrl, seo.image),
    jsonLd: seo.jsonLd,
    itemList: seo.itemList,
    breadcrumb: seo.breadcrumb,
    prev: pn.prev,
    next: pn.next,
    path,
    siteUrl,
    robots: robotsContent(path),
  }
}

export function buildHeadTags(args) {
  const seo = buildSeo(args)
  const base = String(seo.siteUrl || 'http://localhost:5173').replace(/\/$/, '')
  const tags = [
    '<title>' + escapeHtml(seo.title) + '</title>',
    '<meta name="description" content="' + escapeHtml(seo.description) + '" />',
    '<link rel="canonical" href="' + escapeHtml(seo.canonical) + '" />',
    '<meta name="robots" content="' + escapeHtml(seo.robots) + '" />',
    '<meta property="og:type" content="' + escapeHtml(seo.type) + '" />',
    '<meta property="og:title" content="' + escapeHtml(seo.title) + '" />',
    '<meta property="og:description" content="' + escapeHtml(seo.description) + '" />',
    '<meta property="og:url" content="' + escapeHtml(seo.canonical) + '" />',
    '<meta property="og:site_name" content="WebPhim" />',
    '<meta property="og:locale" content="vi_VN" />',
    seo.image ? '<meta property="og:image" content="' + escapeHtml(seo.image) + '" />' : '',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escapeHtml(seo.title) + '" />',
    '<meta name="twitter:description" content="' + escapeHtml(seo.description) + '" />',
    seo.image ? '<meta name="twitter:image" content="' + escapeHtml(seo.image) + '" />' : '',
    seo.prev ? '<link rel="prev" href="' + escapeHtml(seo.prev) + '" />' : '',
    seo.next ? '<link rel="next" href="' + escapeHtml(seo.next) + '" />' : '',
    // Organization JSON-LD (every page)
    '<script type="application/ld+json" data-ssr>' + escapeScriptJson(buildOrganizationJsonLd(base)) + '</script>',
    // WebSite JSON-LD (homepage only)
    seo.path === '/'
      ? '<script type="application/ld+json" data-ssr>' + escapeScriptJson(buildWebSiteJsonLd(base)) + '</script>'
      : '',
    // BreadcrumbList JSON-LD
    seo.breadcrumb ? '<script type="application/ld+json" data-ssr>' + escapeScriptJson(seo.breadcrumb) + '</script>' : '',
    // Movie or TVSeries JSON-LD
    seo.jsonLd ? '<script type="application/ld+json" data-ssr>' + escapeScriptJson(seo.jsonLd) + '</script>' : '',
    // ItemList JSON-LD (list pages)
    seo.itemList ? '<script type="application/ld+json" data-ssr>' + escapeScriptJson(seo.itemList) + '</script>' : '',
  ]
  return tags.filter(Boolean).join('\n    ')
}

export function buildPrerenderDataScript(data) {
  return '<script>window.__WEBPHIM_PRERENDER_DATA__=' + escapeScriptJson(data) + '</script>'
}
