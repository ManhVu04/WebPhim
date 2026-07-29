// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PrerenderDataProvider } from '../lib/prerenderData.jsx'
import { HomePage } from './HomePage.jsx'

const homeData = {
  data: {
    APP_DOMAIN_CDN_IMAGE: 'https://img.example',
    items: [
      {
        slug: 'phim-home-a',
        name: 'Phim Home A',
        poster_url: 'home-a.jpg',
        content: '<p>Nội dung phim A.</p>',
      },
      {
        slug: 'phim-home-b',
        name: 'Phim Home B',
        poster_url: 'home-b.jpg',
      },
    ],
    seoOnPage: {
      titleHead: 'Trang chủ WebPhim',
      descriptionHead: 'Phim nổi bật trên trang chủ.',
    },
  },
}

function jsonLdTypes() {
  return [...document.head.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => JSON.parse(script.textContent)['@type'])
}

describe('HomePage SEO hydration', () => {
  let root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    document.head.innerHTML = `
      <script type="application/ld+json" data-ssr>{"@context":"https://schema.org","@type":"ItemList","itemListElement":[]}</script>
    `
    document.body.innerHTML = '<div id="root"></div>'
    root = createRoot(document.querySelector('#root'))
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })

  it('replaces SSR scripts while retaining Organization, WebSite, and ItemList', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <PrerenderDataProvider initialData={{ home: homeData }}>
            <HomePage />
          </PrerenderDataProvider>
        </MemoryRouter>,
      )
    })

    expect(document.head.querySelector('script[data-ssr]')).toBeNull()
    expect(jsonLdTypes()).toEqual(['Organization', 'ItemList', 'WebSite'])

    const itemList = [...document.head.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => JSON.parse(script.textContent))
      .find((jsonLd) => jsonLd['@type'] === 'ItemList')

    expect(itemList.itemListElement).toHaveLength(2)
    expect(itemList.itemListElement[0].url).toBe('http://localhost:3000/phim/phim-home-a')
  })

  it('uses the first available section for ItemList when home data is unavailable', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <PrerenderDataProvider initialData={{ 'list:phim-moi:1': homeData }}>
            <HomePage />
          </PrerenderDataProvider>
        </MemoryRouter>,
      )
    })

    const itemList = [...document.head.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => JSON.parse(script.textContent))
      .find((jsonLd) => jsonLd['@type'] === 'ItemList')

    expect(itemList.itemListElement).toHaveLength(2)
    expect(document.title).toBe('WebPhim - Xem phim online miễn phí, HD Vietsub')
  })
})
