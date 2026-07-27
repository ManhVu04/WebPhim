import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const serverDir = path.join(distDir, 'server')
const templatePath = path.join(distDir, 'index.html')

const API_BASE = normalizeBase(process.env.PRERENDER_API_BASE_URL || 'https://ophim1.com/v1/api')
const SITE_URL = process.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173'
const FETCH_PEOPLE = process.env.PRERENDER_FETCH_PEOPLE === 'true'
const CONCURRENCY = Math.max(1, Number(process.env.PRERENDER_CONCURRENCY || 6))
const LIST_TYPES = ['phim-moi', 'phim-chieu-rap', 'phim-bo', 'phim-le', 'hoat-hinh', 'phim-sap-chieu']

function normalizeBase(value) {
  return String(value || '').replace(/\/$/, '')
}

function keyList(type, page = 1) {
  return `list:${type}:${page}`
}

function keyCategory(slug, page = 1) {
  return `cat:${slug}:${page}`
}

function keyMovie(slug) {
  return `movie:${slug}`
}

function keyPeople(slug) {
  return `movie-people:${slug}`
}

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
    data[keyList(type)] = json
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
    data[keyCategory(slug)] = json
    routes.add(`/the-loai/${slug}`)
    addMovieSlugs(movieSlugs, json)
  })

  await mapLimit(movieSlugs, CONCURRENCY, async (slug) => {
    const movie = await tryFetch(`/phim/${encodeURIComponent(slug)}`, `movie ${slug}`)
    if (!movie) return
    data[keyMovie(slug)] = movie
    routes.add(`/phim/${slug}`)
    if (FETCH_PEOPLE) {
      const people = await tryFetch(`/phim/${encodeURIComponent(slug)}/peoples`, `people ${slug}`)
      if (people) data[keyPeople(slug)] = people
    }
  })

  for (const route of routes) {
    const output = render({ url: route, data, siteUrl: SITE_URL })
    await writeRoute(route, inject(template, output))
  }

  await rm(serverDir, { recursive: true, force: true })
  console.log(`prerender: wrote ${routes.size} routes`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
