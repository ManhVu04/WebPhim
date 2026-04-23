import { apiCache } from './cache.js';

const API_PREFIX = (import.meta.env.VITE_API_BASE_URL ?? '/api/ophim').replace(/\/$/, '');

async function requestJson(path, { signal } = {}) {
  const res = await fetch(`${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  const text = await res.text();
  if (!res.ok) {
    const msg = text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

export const ophimApi = {
  home() {
    return requestJson('/home');
  },
  list(typeSlug, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString();
    return requestJson(`/danh-sach/${encodeURIComponent(typeSlug)}?${q}`);
  },
  search(keyword, page = 1, { signal } = {}) {
    const q = new URLSearchParams({ keyword: keyword ?? '', page: String(page) }).toString();
    return requestJson(`/tim-kiem?${q}`, { signal });
  },
  categories() {
    return requestJson('/the-loai');
  },
  category(slug, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString();
    return requestJson(`/the-loai/${encodeURIComponent(slug)}?${q}`);
  },
  countries() {
    return requestJson('/quoc-gia');
  },
  country(slug, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString();
    return requestJson(`/quoc-gia/${encodeURIComponent(slug)}?${q}`);
  },
  years() {
    return requestJson('/nam-phat-hanh');
  },
  year(year, page = 1) {
    const q = new URLSearchParams({ page: String(page) }).toString();
    return requestJson(`/nam-phat-hanh/${encodeURIComponent(String(year))}?${q}`);
  },
  movie(slug) {
    return requestJson(`/phim/${encodeURIComponent(slug)}`);
  },
  movieImages(slug) {
    return requestJson(`/phim/${encodeURIComponent(slug)}/images`);
  },
  moviePeople(slug) {
    return requestJson(`/phim/${encodeURIComponent(slug)}/peoples`);
  },
};

// ── Cache key builders ──
export const cacheKeys = {
  home: () => 'home',
  list: (type, page) => `list:${type}:${page}`,
  search: (kw, page) => `search:${kw}:${page}`,
  categories: () => 'categories',
  category: (slug, page) => `cat:${slug}:${page}`,
  countries: () => 'countries',
  country: (slug, page) => `country:${slug}:${page}`,
  years: () => 'years',
  year: (y, page) => `year:${y}:${page}`,
  movie: (slug) => `movie:${slug}`,
};

// ── Prefetch helpers (call on hover) ──
export function prefetchMovie(slug) {
  apiCache.prefetch(cacheKeys.movie(slug), () => ophimApi.movie(slug));
}

export function prefetchList(type, page) {
  apiCache.prefetch(cacheKeys.list(type, page), () => ophimApi.list(type, page));
}
