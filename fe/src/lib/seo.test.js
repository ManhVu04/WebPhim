import { describe, expect, it } from 'vitest'
import {
  buildSeo,
  selectPrerenderData,
  canonicalUrl,
  parseDuration,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  buildItemListJsonLd,
  buildMediaJsonLd,
  buildWatchSeo,
  buildHeadTags,
} from './seo.js'

describe('buildSeo', () => {
  it('uses movie data for detail metadata', () => {
    const seo = buildSeo({
      url: '/phim/demo',
      siteUrl: 'https://webphim.example',
      data: {
        'movie:demo': {
          data: {
            APP_DOMAIN_CDN_IMAGE: 'https://img.example',
            item: {
              name: 'Demo Phim',
              origin_name: 'Demo Movie',
              slug: 'demo',
              content: '<p>Nội dung phim demo rất hay.</p>',
              poster_url: 'demo.jpg',
              year: 2026,
              time: '120 phút',
              lang: 'Vietsub',
              category: [{ name: 'Hành Động', slug: 'hanh-dong' }],
              country: [{ name: 'Mỹ', slug: 'my' }],
              episode_total: '16',
              type: 'single',
              tmdb: { vote_average: 8.5, vote_count: 12 },
            },
          },
        },
      },
    })

    expect(seo.title).toBe('Demo Phim - Xem phim Vietsub HD | WebPhim')
    expect(seo.description).toBe('Nội dung phim demo rất hay.')
    expect(seo.canonical).toBe('https://webphim.example/phim/demo')
    expect(seo.image).toBe('https://img.example/uploads/movies/demo.jpg')

    // Movie JSON-LD
    expect(seo.jsonLd.name).toBe('Demo Phim')
    expect(seo.jsonLd['@type']).toBe('Movie')
    expect(seo.jsonLd.url).toBe('https://webphim.example/phim/demo')
    expect(seo.jsonLd.genre).toEqual(['Hành Động'])
    expect(seo.jsonLd.countryOfOrigin).toEqual([{ '@type': 'Country', name: 'Mỹ' }])
    expect(seo.jsonLd.inLanguage).toBe('vi')
    expect(seo.jsonLd.duration).toBe('PT120M')
    expect(seo.jsonLd.numberOfEpisodes).toBeUndefined()
    expect(seo.jsonLd.aggregateRating.ratingValue).toBe(8.5)
    expect(seo.videoJsonLd).toBeUndefined()
  })

  it('builds noindex share metadata for a watch route', () => {
    const seo = buildSeo({
      url: '/xem/demo?server=0&ep=1',
      siteUrl: 'https://webphim.example',
      data: {
        'movie:demo': {
          data: {
            APP_DOMAIN_CDN_IMAGE: 'https://img.example',
            item: {
              name: 'Demo Phim',
              slug: 'demo',
              content: '<p>Nội dung phim demo.</p>',
              poster_url: 'demo.jpg',
            },
          },
        },
      },
    })

    expect(seo.title).toBe('Demo Phim - Xem phim online | WebPhim')
    expect(seo.description).toBe('Nội dung phim demo.')
    expect(seo.canonical).toBe('https://webphim.example/xem/demo')
    expect(seo.robots).toBe('noindex, follow')
    expect(seo.type).toBe('video.movie')
    expect(seo.image).toBe('https://img.example/uploads/movies/demo.jpg')
    expect(seo.jsonLd).toBeUndefined()
  })

  it('builds generic noindex share metadata for the search route', () => {
    const seo = buildSeo({
      url: '/tim-kiem?keyword=matrix&page=2',
      siteUrl: 'https://webphim.example',
    })

    expect(seo.title).toBe('Tìm kiếm phim - WebPhim')
    expect(seo.description).toBe('Tìm kiếm phim theo tên phim tại WebPhim.')
    expect(seo.canonical).toBe('https://webphim.example/tim-kiem')
    expect(seo.robots).toBe('noindex, follow')
  })

  it('drops page=1 from canonical URLs', () => {
    const seo = buildSeo({
      url: '/danh-sach/phim-moi?page=1',
      siteUrl: 'https://webphim.example',
      data: {},
    })

    expect(seo.canonical).toBe('https://webphim.example/danh-sach/phim-moi')
  })

  it('includes ItemList JSON-LD for list pages', () => {
    const seo = buildSeo({
      url: '/danh-sach/phim-moi',
      siteUrl: 'https://webphim.example',
      data: {
        'list:phim-moi:1': {
          data: {
            APP_DOMAIN_CDN_IMAGE: 'https://img.example',
            items: [
              { slug: 'phim-a', name: 'Phim A', poster_url: 'a.jpg' },
              { slug: 'phim-b', name: 'Phim B', poster_url: 'b.jpg' },
            ],
            seoOnPage: { titleHead: 'Phim mới', descriptionHead: 'Danh sách phim mới' },
          },
        },
      },
    })

    expect(seo.itemList).toBeDefined()
    expect(seo.itemList['@type']).toBe('ItemList')
    expect(seo.itemList.itemListElement).toHaveLength(2)
    expect(seo.itemList.itemListElement[0].url).toBe('https://webphim.example/phim/phim-a')
    expect(seo.itemList.itemListElement[0].position).toBe(1)
  })

  it('builds homepage metadata and ItemList from home data', () => {
    const seo = buildSeo({
      url: '/',
      siteUrl: 'https://webphim.example',
      data: {
        home: {
          data: {
            items: [
              { slug: 'phim-home-a', name: 'Phim Home A' },
              { slug: 'phim-home-b', name: 'Phim Home B' },
            ],
            seoOnPage: {
              titleHead: 'Trang chủ WebPhim',
              descriptionHead: 'Phim nổi bật trên trang chủ.',
            },
          },
        },
      },
    })

    expect(seo.title).toBe('Trang chủ WebPhim')
    expect(seo.description).toBe('Phim nổi bật trên trang chủ.')
    expect(seo.canonical).toBe('https://webphim.example/')
    expect(seo.path).toBe('/')
    expect(seo.siteUrl).toBe('https://webphim.example')
    expect(seo.itemList.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        url: 'https://webphim.example/phim/phim-home-a',
      },
      {
        '@type': 'ListItem',
        position: 2,
        url: 'https://webphim.example/phim/phim-home-b',
      },
    ])
  })
})

describe('canonicalUrl', () => {
  it('keeps a self canonical watch URL while stripping episode params', () => {
    const result = canonicalUrl('/xem/demo?server=0&ep=1', 'https://webphim.example')
    expect(result).toBe('https://webphim.example/xem/demo')
  })

  it('maps legacy pagination to the public page route', () => {
    const result = canonicalUrl('/danh-sach/phim-moi?page=2&sort=new', 'https://webphim.example')
    expect(result).toBe('https://webphim.example/danh-sach/phim-moi/trang/2')
  })

  it('strips page=1', () => {
    const result = canonicalUrl('/danh-sach/phim-moi?page=1', 'https://webphim.example')
    expect(result).toBe('https://webphim.example/danh-sach/phim-moi')
  })

  it('normalizes page > 1 to a path route', () => {
    const result = canonicalUrl('/the-loai/hanh-dong?page=3', 'https://webphim.example')
    expect(result).toBe('https://webphim.example/the-loai/hanh-dong/trang/3')
  })

  it('normalizes trailing slashes and invalid page values', () => {
    expect(canonicalUrl('/phim/demo/?utm_source=x', 'https://webphim.example'))
      .toBe('https://webphim.example/phim/demo')
    expect(canonicalUrl('/danh-sach/phim-moi?page=abc', 'https://webphim.example'))
      .toBe('https://webphim.example/danh-sach/phim-moi')
  })
})

describe('buildWatchSeo', () => {
  it('includes the selected episode in client metadata', () => {
    expect(buildWatchSeo(
      { name: 'Demo Phim', content: '<p>Nội dung phim demo.</p>' },
      { episodeName: 'Tập 2', image: 'https://img.example/demo.jpg' },
    )).toEqual({
      title: 'Demo Phim - Tập 2 - Xem phim online | WebPhim',
      description: 'Nội dung phim demo.',
      type: 'video.episode',
      image: 'https://img.example/demo.jpg',
    })
  })
})

describe('parseDuration', () => {
  it('parses "120 phút"', () => {
    expect(parseDuration('120 phút')).toBe('PT120M')
  })

  it('parses "2h 30m"', () => {
    expect(parseDuration('2h 30m')).toBe('PT2H30M')
  })

  it('parses "2h"', () => {
    expect(parseDuration('2h')).toBe('PT2H')
  })

  it('parses plain number as minutes', () => {
    expect(parseDuration('90')).toBe('PT90M')
  })

  it('parses "45 min"', () => {
    expect(parseDuration('45 min')).toBe('PT45M')
  })

  it('returns undefined for empty/null', () => {
    expect(parseDuration(null)).toBeUndefined()
    expect(parseDuration('')).toBeUndefined()
  })

  it('returns undefined for unparseable strings', () => {
    expect(parseDuration('not a duration')).toBeUndefined()
  })
})

describe('buildOrganizationJsonLd', () => {
  it('builds Organization with correct structure', () => {
    const org = buildOrganizationJsonLd('https://webphim.example')
    expect(org['@context']).toBe('https://schema.org')
    expect(org['@type']).toBe('Organization')
    expect(org.name).toBe('WebPhim')
    expect(org.url).toBe('https://webphim.example/')
    expect(org.logo).toBe('https://webphim.example/favicon.svg')
  })
})

describe('buildWebSiteJsonLd', () => {
  it('builds WebSite without a noindex SearchAction target', () => {
    const ws = buildWebSiteJsonLd('https://webphim.example')
    expect(ws['@type']).toBe('WebSite')
    expect(ws.name).toBe('WebPhim')
    expect(ws.potentialAction).toBeUndefined()
  })
})

describe('buildItemListJsonLd', () => {
  it('builds ItemList from movie items', () => {
    const items = [
      { slug: 'movie-a', name: 'Movie A', poster_url: 'a.jpg' },
      { slug: 'movie-b', name: 'Movie B' },
    ]
    const list = buildItemListJsonLd(items, 'https://webphim.example')
    expect(list['@type']).toBe('ItemList')
    expect(list.itemListElement).toHaveLength(2)
    expect(list.itemListElement[0].position).toBe(1)
    expect(list.itemListElement[0].url).toBe('https://webphim.example/phim/movie-a')
    expect(list.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      url: 'https://webphim.example/phim/movie-a',
    })
  })

  it('returns undefined for empty items', () => {
    expect(buildItemListJsonLd([], 'https://webphim.example')).toBeUndefined()
    expect(buildItemListJsonLd(null, 'https://webphim.example')).toBeUndefined()
  })

  it('contains every visible item', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ slug: `m${i}`, name: `M${i}` }))
    const list = buildItemListJsonLd(items, 'https://webphim.example')
    expect(list.itemListElement).toHaveLength(30)
  })
})

describe('buildMediaJsonLd', () => {
  it('uses TVSeries and parses an episode count only for a series', () => {
    const jsonLd = buildMediaJsonLd(
      { name: 'Series', slug: 'series', type: 'series', episode_total: 'Hoàn tất (16/16)' },
      null,
      'https://webphim.example',
      'https://img.example/series.jpg',
    )
    expect(jsonLd['@type']).toBe('TVSeries')
    expect(jsonLd.numberOfEpisodes).toBe(16)
    expect(jsonLd.duration).toBeUndefined()
  })

  it('does not emit VideoObject markup in movie head tags', () => {
    const head = buildHeadTags({
      url: '/phim/demo',
      siteUrl: 'https://webphim.example',
      data: {
        'movie:demo': {
          data: { item: { name: 'Demo', slug: 'demo', type: 'single' } },
        },
      },
    })
    expect(head).not.toContain('VideoObject')
  })
})

describe('selectPrerenderData', () => {
  const data = {
    home: { page: 'home' },
    'list:phim-moi:1': { page: 'new' },
    'list:phim-bo:1': { page: 'series' },
    'cat:hanh-dong:1': { page: 'category' },
    'movie:demo': { page: 'movie' },
    'movie-people:demo': { page: 'people' },
    'movie:unrelated': { page: 'unrelated' },
  }

  it('keeps only home data and first-page sections on the home route', () => {
    expect(selectPrerenderData('/', data)).toEqual({
      home: data.home,
      'list:phim-moi:1': data['list:phim-moi:1'],
      'list:phim-bo:1': data['list:phim-bo:1'],
    })
  })

  it('keeps only detail, people, and recommendation data on a movie route', () => {
    expect(selectPrerenderData('/phim/demo', data)).toEqual({
      'movie:demo': data['movie:demo'],
      'movie-people:demo': data['movie-people:demo'],
      'list:phim-moi:1': data['list:phim-moi:1'],
    })
  })

  it('keeps movie and recommendation data on a watch route', () => {
    expect(selectPrerenderData('/xem/demo?server=0&ep=1', data)).toEqual({
      'movie:demo': data['movie:demo'],
      'list:phim-moi:1': data['list:phim-moi:1'],
    })
  })

  it('keeps only the matching list or category payload', () => {
    expect(selectPrerenderData('/danh-sach/phim-moi?page=1', data)).toEqual({
      'list:phim-moi:1': data['list:phim-moi:1'],
    })
    expect(selectPrerenderData('/the-loai/hanh-dong', data)).toEqual({
      'cat:hanh-dong:1': data['cat:hanh-dong:1'],
    })
  })

  it('selects data for a path-based pagination route', () => {
    const pageData = { 'cat:hanh-dong:3': { page: 'category-3' } }
    expect(selectPrerenderData('/the-loai/hanh-dong/trang/3', pageData)).toEqual(pageData)
  })
})
