import { describe, expect, it } from 'vitest'
import {
  buildPublicPagePath,
  legacyPaginationTarget,
  normalizePage,
  pageFromUrl,
  publicPaginationBase,
} from './paginationRoutes.js'

describe('paginationRoutes', () => {
  it('normalizes invalid pages to page one', () => {
    expect(normalizePage('2')).toBe(2)
    expect(normalizePage('0')).toBe(1)
    expect(normalizePage('abc')).toBe(1)
    expect(normalizePage('2.5')).toBe(1)
  })

  it('builds clean public pagination paths', () => {
    expect(buildPublicPagePath('/the-loai/hanh-dong', 1)).toBe('/the-loai/hanh-dong')
    expect(buildPublicPagePath('/the-loai/hanh-dong', 2)).toBe('/the-loai/hanh-dong/trang/2')
    expect(buildPublicPagePath('/the-loai/hanh-dong/trang/2', 3)).toBe('/the-loai/hanh-dong/trang/3')
  })

  it('reads page numbers from path routes before legacy query values', () => {
    expect(pageFromUrl('/quoc-gia/han-quoc/trang/4?page=2')).toBe(4)
    expect(pageFromUrl('/quoc-gia/han-quoc?page=2')).toBe(2)
  })

  it('creates a client fallback target only for public legacy routes', () => {
    expect(legacyPaginationTarget('/danh-sach/phim-moi', '?page=3'))
      .toBe('/danh-sach/phim-moi/trang/3')
    expect(legacyPaginationTarget('/tim-kiem', '?keyword=a&page=3')).toBeNull()
    expect(publicPaginationBase('/nam-phat-hanh/2026/trang/2')).toBe('/nam-phat-hanh/2026')
  })
})
