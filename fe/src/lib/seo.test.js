import { describe, expect, it } from 'vitest'
import { buildSeo, selectPrerenderData } from './seo.js'

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
              content: '<p>Nội dung phim demo rất hay.</p>',
              poster_url: 'demo.jpg',
              year: 2026,
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
    expect(seo.jsonLd.name).toBe('Demo Phim')
  })

  it('drops page=1 from canonical URLs', () => {
    const seo = buildSeo({
      url: '/danh-sach/phim-moi?page=1',
      siteUrl: 'https://webphim.example',
      data: {},
    })

    expect(seo.canonical).toBe('https://webphim.example/danh-sach/phim-moi')
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

  it('keeps only the matching list or category payload', () => {
    expect(selectPrerenderData('/danh-sach/phim-moi?page=1', data)).toEqual({
      'list:phim-moi:1': data['list:phim-moi:1'],
    })
    expect(selectPrerenderData('/the-loai/hanh-dong', data)).toEqual({
      'cat:hanh-dong:1': data['cat:hanh-dong:1'],
    })
  })
})
