const PUBLIC_PAGINATION_RE = /^\/(?:danh-sach\/[^/]+|the-loai\/[^/]+|quoc-gia\/[^/]+|nam-phat-hanh\/\d+)(?:\/trang\/([^/]+))?\/?$/

export function normalizePage(value) {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

export function pageFromUrl(url, siteUrl = 'http://localhost') {
  const parsed = new URL(url, siteUrl)
  const match = parsed.pathname.match(PUBLIC_PAGINATION_RE)
  if (match?.[1]) return normalizePage(match[1])
  return normalizePage(parsed.searchParams.get('page'))
}

export function publicPaginationBase(pathname) {
  const normalized = String(pathname || '/').replace(/\/+$/, '') || '/'
  const match = normalized.match(PUBLIC_PAGINATION_RE)
  if (!match) return normalized
  return normalized.replace(/\/trang\/[^/]+$/, '')
}

export function buildPublicPagePath(pathname, page) {
  const base = publicPaginationBase(pathname)
  const normalizedPage = normalizePage(page)
  return normalizedPage > 1 ? `${base}/trang/${normalizedPage}` : base
}

export function legacyPaginationTarget(pathname, search = '') {
  const base = publicPaginationBase(pathname)
  if (!PUBLIC_PAGINATION_RE.test(base)) return null
  const params = new URLSearchParams(search)
  if (!params.has('page')) return null
  return buildPublicPagePath(base, params.get('page'))
}

export function isPublicPaginatedPath(pathname) {
  return PUBLIC_PAGINATION_RE.test(String(pathname || ''))
}
