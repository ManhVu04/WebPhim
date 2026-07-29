import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { cacheKeys } from '../src/lib/api.js'
import { escapeHtml } from '../src/lib/seo.js'
import { buildPosterUrl } from '../src/lib/image.js'
import { buildPublicPagePath } from '../src/lib/paginationRoutes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const serverDir = path.join(distDir, 'server')
const templatePath = path.join(distDir, 'index.html')

const API_BASE = normalizeBase(process.env.PRERENDER_API_BASE_URL || 'https://ophim1.com/v1/api')
const SITE_URL = validateSiteUrl(process.env.VITE_PUBLIC_SITE_URL)
const SITE_BASE = SITE_URL.replace(/\/$/, '')
const FETCH_PEOPLE = process.env.PRERENDER_FETCH_PEOPLE === 'true'
const CONCURRENCY = Math.max(1, Number(process.env.PRERENDER_CONCURRENCY || 6))
const LIST_TYPES = ['phim-moi', 'phim-chieu-rap', 'phim-bo', 'phim-le', 'hoat-hinh', 'phim-sap-chieu']
const MAX_PAGES = Math.max(0, Number(process.env.PRERENDER_MAX_PAGES || 0))
const SITEMAP_URL_LIMIT = 50_000

function normalizeBase(value) {
  return String(value || '').replace(/\/$/, '')
}

function validateSiteUrl(value) {
  if (!value) throw new Error('prerender: VITE_PUBLIC_SITE_URL is required')
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:') {
    throw new Error('prerender: VITE_PUBLIC_SITE_URL must use HTTPS')
  }
  if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.example')) {
    throw new Error('prerender: VITE_PUBLIC_SITE_URL must use the real production hostname')
  }
  return parsed.origin
}

const key = cacheKeys // alias for brevity

function apiUrl(endpoint) {
  return `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

async function fetchJson(endpoint) {
  const res = await fetch(apiUrl(endpoint), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function tryFetch(endpoint, label) {
  try {
    return await fetchJson(endpoint)
  } catch (error) {
    console.warn(`prerender: skip ${label}: ${error.message}`)
    return null
  }
}

async function fetchRequired(endpoint, label) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchJson(endpoint)
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250))
    }
  }
  throw new Error(`prerender: failed required ${label}: ${lastError.message}`, { cause: lastError })
}

async function mapLimit(items, limit, worker) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      await worker(item)
    }
  })
  await Promise.all(workers)
}

function normalizeItems(json) {
  const data = json?.data || json || {}
  return data.items || data.data?.items || []
}

function addMovieSlugs(slugs, json) {
  for (const item of normalizeItems(json)) {
    if (item?.slug) slugs.add(item.slug)
  }
}

function stripManagedHead(template) {
  return template
    .replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace(/\s*<link rel="canonical"[^>]*>/g, '')
    .replace(/\s*<link rel="alternate"[^>]*hreflang[^>]*>/g, '')
    .replace(/\s*<meta (?:property|name)="(?:og|twitter):[^>]*>/g, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
}

function inject(template, { html, head, dataScript }) {
  const cleaned = stripManagedHead(template)
  return cleaned
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>\n    ${dataScript}`)
}

function routeFile(route) {
  if (route === '/') return path.join(distDir, 'index.html')
  if (route.includes('?') || route.includes('#')) {
    throw new Error(`prerender: route must not contain query or hash: ${route}`)
  }
  const relativeRoute = route.replace(/^\/+/, '')
  const file = path.resolve(distDir, relativeRoute, 'index.html')
  if (!file.startsWith(`${distDir}${path.sep}`)) {
    throw new Error(`prerender: refused route outside dist: ${route}`)
  }
  return file
}

async function writeRoute(route, html) {
  const file = routeFile(route)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
}

// ---------------------------------------------------------------------------
// Sitemap Generation — Sitemap Index with sub-sitemaps
// ---------------------------------------------------------------------------

/**
 * Build a single <url> entry, optionally with an image and trustworthy lastmod.
 */
function buildUrlEntry(route, { image, lastmod } = {}) {
  const loc = SITE_BASE + route
  const lines = [
    '  <url>',
    '    <loc>' + escapeHtml(loc) + '</loc>',
  ]
  if (lastmod) lines.push('    <lastmod>' + escapeHtml(lastmod) + '</lastmod>')

  if (image) {
    lines.push(
      '    <image:image>',
      '      <image:loc>' + escapeHtml(image) + '</image:loc>',
      '    </image:image>',
    )
  }

  lines.push('  </url>')
  return lines.join('\n')
}

function wrapUrlset(urls, { includeImageNs = false } = {}) {
  const nsAttrs = [
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  ]
  if (includeImageNs) nsAttrs.push('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset ' + nsAttrs.join('\n       ') + '>',
    urls,
    '</urlset>',
  ].join('\n')
}

function generateSitemapIndex(sitemapFiles) {
  const entries = sitemapFiles.map(file =>
    '  <sitemap>\n' +
    '    <loc>' + escapeHtml(SITE_BASE + '/' + file) + '</loc>\n' +
    '  </sitemap>'
  ).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</sitemapindex>',
  ].join('\n')
}

/**
 * Extract movie metadata for sitemap image/video tags.
 */
function getMovieMeta(data, slug) {
  const movieData = data[key.movie(slug)]
  if (!movieData) return {}
  const payload = movieData?.data || movieData || {}
  const item = payload.item || payload.data?.item || payload
  const cdn = payload.APP_DOMAIN_CDN_IMAGE || payload.APP_DOMAIN_CDN || ''
  const poster = buildPosterUrl(cdn, item?.poster_url, item?.thumb_url)
  const imageUrl = poster && !poster.startsWith('/') ? poster : (poster ? SITE_BASE + poster : '')

  const modified = item?.modified?.time || item?.updatedAt || item?.updated_at
  const modifiedDate = modified ? new Date(modified) : null
  const lastmod = modifiedDate && !Number.isNaN(modifiedDate.valueOf())
    ? modifiedDate.toISOString()
    : undefined

  return {
    image: imageUrl || undefined,
    lastmod,
  }
}

function getPageCount(json) {
  return json?.data?.params?.pagination?.pageCount
    ? Number(json.data.params.pagination.pageCount)
    : 1
}

async function fetchAllPages(baseEndpoint, label, maxPages) {
  const firstJson = await fetchRequired(`${baseEndpoint}?page=1`, `${label} page 1`)
  const pagesData = { '?page=1': firstJson }
  const pageCount = getPageCount(firstJson) || 1
  const total = maxPages > 0 ? Math.min(pageCount, maxPages) : pageCount
  for (let p = 2; p <= total; p++) {
    const json = await fetchRequired(`${baseEndpoint}?page=${p}`, `${label} page ${p}`)
    pagesData[`?page=${p}`] = json
  }
  return { pages: pagesData, firstData: firstJson }
}

function chunks(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result.length ? result : [[]]
}

async function writeSitemapGroup(prefix, routes, entryBuilder, options = {}) {
  const files = []
  const routeChunks = chunks([...routes].sort(), SITEMAP_URL_LIMIT)
  for (let index = 0; index < routeChunks.length; index++) {
    const suffix = routeChunks.length > 1 ? `-${index + 1}` : ''
    const file = `${prefix}${suffix}.xml`
    const urls = routeChunks[index].map(entryBuilder).join('\n')
    await writeFile(path.join(distDir, file), wrapUrlset(urls, options), 'utf8')
    files.push(file)
  }
  return files
}

async function main() {
  const template = await readFile(templatePath, 'utf8')
  const { render } = await import(pathToFileURL(path.join(serverDir, 'entry-server.js')).href)
  const routes = new Set(['/'])
  const data = {}
  const movieSlugs = new Set()

  // Track routes by category for sub-sitemaps
  const staticRoutes = new Set(['/'])
  const movieRoutes = new Set()
  const listRoutes = new Set()

  const home = await fetchRequired('/home', 'home data')
  data.home = home
  addMovieSlugs(movieSlugs, home)

  for (const type of LIST_TYPES) {
    const { pages } = await fetchAllPages(`/danh-sach/${encodeURIComponent(type)}`, `list ${type}`, MAX_PAGES)
    for (const [suffix, pageData] of Object.entries(pages)) {
      const pageNum = Number(new URLSearchParams(suffix.slice(1)).get('page')) || 1
      data[key.list(type, pageNum)] = pageData
      const route = buildPublicPagePath(`/danh-sach/${type}`, pageNum)
      routes.add(route)
      listRoutes.add(route)
      addMovieSlugs(movieSlugs, pageData)
    }
  }

  const categories = await fetchRequired('/the-loai', 'categories')
  data[key.categories()] = categories
  const categoryItems = normalizeItems(categories)
  await mapLimit(categoryItems, CONCURRENCY, async (category) => {
    if (!category?.slug) return
    const slug = category.slug
    const { pages } = await fetchAllPages(`/the-loai/${encodeURIComponent(slug)}`, `cat ${slug}`, MAX_PAGES)
    for (const [suffix, pageData] of Object.entries(pages)) {
      const pageNum = Number(new URLSearchParams(suffix.slice(1)).get('page')) || 1
      data[key.category(slug, pageNum)] = pageData
      const route = buildPublicPagePath(`/the-loai/${slug}`, pageNum)
      routes.add(route)
      listRoutes.add(route)
      addMovieSlugs(movieSlugs, pageData)
    }
  })

  routes.add('/the-loai')
  routes.add('/quoc-gia')
  routes.add('/nam-phat-hanh')
  staticRoutes.add('/the-loai')
  staticRoutes.add('/quoc-gia')
  staticRoutes.add('/nam-phat-hanh')

  const countries = await fetchRequired('/quoc-gia', 'countries')
  data[key.countries()] = countries
  const countryItems = normalizeItems(countries)
  await mapLimit(countryItems, CONCURRENCY, async (country) => {
    if (!country?.slug) return
    const slug = country.slug
    const { pages } = await fetchAllPages(`/quoc-gia/${encodeURIComponent(slug)}`, `country ${slug}`, MAX_PAGES)
    for (const [suffix, pageData] of Object.entries(pages)) {
      const pageNum = Number(new URLSearchParams(suffix.slice(1)).get('page')) || 1
      data[key.country(slug, pageNum)] = pageData
      const route = buildPublicPagePath(`/quoc-gia/${slug}`, pageNum)
      routes.add(route)
      listRoutes.add(route)
      addMovieSlugs(movieSlugs, pageData)
    }
  })

  const yearsJson = await fetchRequired('/nam-phat-hanh', 'years')
  data[key.years()] = yearsJson
  const yearItems = normalizeItems(yearsJson)
  await mapLimit(yearItems, CONCURRENCY, async (item) => {
    const year = typeof item === 'number' ? item : Number(item?.year ?? item?.name ?? item)
    if (!Number.isFinite(year)) return
    const { pages } = await fetchAllPages(`/nam-phat-hanh/${encodeURIComponent(String(year))}`, `year ${year}`, MAX_PAGES)
    for (const [suffix, pageData] of Object.entries(pages)) {
      const pageNum = Number(new URLSearchParams(suffix.slice(1)).get('page')) || 1
      data[key.year(year, pageNum)] = pageData
      const route = buildPublicPagePath(`/nam-phat-hanh/${year}`, pageNum)
      routes.add(route)
      listRoutes.add(route)
      addMovieSlugs(movieSlugs, pageData)
    }
  })

  await mapLimit(movieSlugs, CONCURRENCY, async (slug) => {
    const movie = await fetchRequired(`/phim/${encodeURIComponent(slug)}`, `movie ${slug}`)
    data[key.movie(slug)] = movie
    const route = `/phim/${slug}`
    routes.add(route)
    movieRoutes.add(route)
    if (FETCH_PEOPLE) {
      const people = await tryFetch(`/phim/${encodeURIComponent(slug)}/peoples`, `people ${slug}`)
      if (people) data[key.moviePeople(slug)] = people
    }
  })

  for (const route of routes) {
    const output = render({ url: route, data, siteUrl: SITE_URL })
    if (output.html.includes('Switched to client rendering because the server rendering errored')) {
      throw new Error(`prerender: SSR failed for ${route}`)
    }
    await writeRoute(route, inject(template, output))
  }

  // -----------------------------------------------------------------------
  // Generate Sitemap Index with sub-sitemaps
  // -----------------------------------------------------------------------

  // 1. sitemap-static.xml — homepage, taxonomy index pages
  const staticSitemaps = await writeSitemapGroup(
    'sitemap-static',
    staticRoutes,
    (route) => buildUrlEntry(route),
  )

  // 2. sitemap-movies.xml — all /phim/:slug with image tags
  const movieSitemaps = await writeSitemapGroup(
    'sitemap-movies',
    movieRoutes,
    (route) => {
      const slug = route.replace('/phim/', '')
      return buildUrlEntry(route, getMovieMeta(data, slug))
    },
    { includeImageNs: true },
  )

  // 3. sitemap-lists.xml — /danh-sach/, /the-loai/:slug, /quoc-gia/:slug, /nam-phat-hanh/:year (with pages)
  const listSitemaps = await writeSitemapGroup(
    'sitemap-lists',
    listRoutes,
    (route) => buildUrlEntry(route),
  )

  // 4. sitemap.xml — Sitemap Index pointing to sub-sitemaps
  const sitemapNames = [...staticSitemaps, ...movieSitemaps, ...listSitemaps]
  const sitemapIndex = generateSitemapIndex(sitemapNames)
  await writeFile(path.join(distDir, 'sitemap.xml'), sitemapIndex, 'utf8')

  console.log(`prerender: wrote sitemap index with ${sitemapNames.length} sub-sitemaps (${routes.size} URLs total)`)
  console.log(`  - static: ${staticRoutes.size} URLs`)
  console.log(`  - movies: ${movieRoutes.size} URLs (with image tags)`)
  console.log(`  - lists: ${listRoutes.size} URLs`)

  // -----------------------------------------------------------------------
  // robots.txt
  // -----------------------------------------------------------------------
  const robots = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    "Sitemap: " + SITE_BASE + "/sitemap.xml",
  ].join("\n")
  await writeFile(path.join(distDir, "robots.txt"), robots, "utf8")
  console.log("prerender: wrote robots.txt")

  await rm(serverDir, { recursive: true, force: true })
  console.log(`prerender: wrote ${routes.size} routes`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
