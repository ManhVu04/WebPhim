import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { cacheKeys } from '../src/lib/api.js'
import { escapeHtml } from '../src/lib/seo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const serverDir = path.join(distDir, 'server')
const templatePath = path.join(distDir, 'index.html')

const API_BASE = normalizeBase(process.env.PRERENDER_API_BASE_URL || 'https://ophim1.com/v1/api')
const SITE_URL = process.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173'
const SITE_BASE = SITE_URL.replace(/\/$/, '')
const FETCH_PEOPLE = process.env.PRERENDER_FETCH_PEOPLE === 'true'
const CONCURRENCY = Math.max(1, Number(process.env.PRERENDER_CONCURRENCY || 6))
const LIST_TYPES = ['phim-moi', 'phim-chieu-rap', 'phim-bo', 'phim-le', 'hoat-hinh', 'phim-sap-chieu']

function normalizeBase(value) {
  return String(value || '').replace(/\/$/, '')
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
  try {
    return await fetchJson(endpoint)
  } catch (error) {
    throw new Error(`prerender: failed required ${label}: ${error.message}`, { cause: error })
  }
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


function sitemapPriority(route) {
  if (route === '/') return '1.0'
  if (route.startsWith('/danh-sach/phim-moi')) return '0.9'
  if (route.startsWith('/danh-sach/')) return '0.8'
  if (route.startsWith('/phim/')) return '0.8'
  if (route === '/the-loai' || route === '/quoc-gia' || route === '/nam-phat-hanh') return '0.7'
  if (/^\/(the-loai|quoc-gia|nam-phat-hanh)\//.test(route)) return '0.6'
  return '0.5'
}

function sitemapChangeFreq(route) {
  if (route === '/' || route.startsWith('/danh-sach/')) return 'daily'
  return 'weekly'
}

function generateSitemap(routes) {
  const now = new Date().toISOString().split('T')[0]
  const base = SITE_BASE
  const sorted = [...routes].sort()

  const urls = sorted.map(route => {
    const loc = base + route
    return [
      '  <url>',
      '    <loc>' + escapeHtml(loc) + '</loc>',
      '    <lastmod>' + now + '</lastmod>',
      '    <changefreq>' + sitemapChangeFreq(route) + '</changefreq>',
      '    <priority>' + sitemapPriority(route) + '</priority>',
      '  </url>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
  ].join('\n')
}

async function main() {
  const template = await readFile(templatePath, 'utf8')
  const { render } = await import(pathToFileURL(path.join(serverDir, 'entry-server.js')).href)
  const routes = new Set(['/'])
  const data = {}
  const movieSlugs = new Set()

  const home = await fetchRequired('/home', 'home data')
  data.home = home
  addMovieSlugs(movieSlugs, home)

  for (const type of LIST_TYPES) {
    const json = await tryFetch(`/danh-sach/${encodeURIComponent(type)}?page=1`, `list ${type}`)
    if (!json) continue
    data[key.list(type)] = json
    routes.add(`/danh-sach/${type}`)
    addMovieSlugs(movieSlugs, json)
  }

  const categories = await tryFetch('/the-loai', 'categories')
  const categoryItems = normalizeItems(categories)
  await mapLimit(categoryItems, CONCURRENCY, async (category) => {
    if (!category?.slug) return
    const slug = category.slug
    const json = await tryFetch(`/the-loai/${encodeURIComponent(slug)}?page=1`, `category ${slug}`)
    if (!json) return
    data[key.category(slug)] = json
    routes.add(`/the-loai/${slug}`)
    addMovieSlugs(movieSlugs, json)
  })



  routes.add('/the-loai')
  routes.add('/quoc-gia')
  routes.add('/nam-phat-hanh')

  const countries = await tryFetch('/quoc-gia', 'countries')
  const countryItems = normalizeItems(countries)
  await mapLimit(countryItems, CONCURRENCY, async (country) => {
    if (!country?.slug) return
    const slug = country.slug
    const json = await tryFetch(`/quoc-gia/${encodeURIComponent(slug)}?page=1`, `country ${slug}`)
    if (!json) return
    data[key.country(slug)] = json
    routes.add('/quoc-gia/' + slug)
    addMovieSlugs(movieSlugs, json)
  })

  const yearsJson = await tryFetch('/nam-phat-hanh', 'years')
  const yearItems = normalizeItems(yearsJson)
  await mapLimit(yearItems, CONCURRENCY, async (item) => {
    const year = typeof item === 'number' ? item : Number(item?.year ?? item?.name ?? item)
    if (!Number.isFinite(year)) return
    const json = await tryFetch(`/nam-phat-hanh/${encodeURIComponent(String(year))}?page=1`, `year ${year}`)
    if (!json) return
    data[key.year(year)] = json
    routes.add('/nam-phat-hanh/' + year)
    addMovieSlugs(movieSlugs, json)
  })

  await mapLimit(movieSlugs, CONCURRENCY, async (slug) => {
    const movie = await tryFetch(`/phim/${encodeURIComponent(slug)}`, `movie ${slug}`)
    if (!movie) return
    data[key.movie(slug)] = movie
    routes.add(`/phim/${slug}`)
    if (FETCH_PEOPLE) {
      const people = await tryFetch(`/phim/${encodeURIComponent(slug)}/peoples`, `people ${slug}`)
      if (people) data[key.moviePeople(slug)] = people
    }
  })

  for (const route of routes) {
    const output = render({ url: route, data, siteUrl: SITE_URL })
    await writeRoute(route, inject(template, output))
  }


  const sitemap = generateSitemap(routes)
  await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8')
  console.log(`prerender: wrote sitemap.xml with ${routes.size} URLs`)

  const robots = [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /dang-nhap",
    "Disallow: /dang-ky",
    "Disallow: /quen-mat-khau",
    "Disallow: /dat-lai-mat-khau",
    "Disallow: /xac-minh-email",
    "Disallow: /yeu-thich",
    "Disallow: /lich-su",
    "Disallow: /tai-khoan/",
    "Disallow: /tim-kiem",
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
