// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchPage } from './SearchPage.jsx'

const searchMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/api.js', () => ({
  ophimApi: { search: searchMock },
}))

function metaContent(selector) {
  return document.head.querySelector(selector)?.getAttribute('content')
}

function organizationCount() {
  return [...document.head.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => JSON.parse(script.textContent))
    .filter((jsonLd) => jsonLd['@type'] === 'Organization')
    .length
}

describe('SearchPage client metadata', () => {
  let root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    document.head.innerHTML = ''
    document.body.innerHTML = '<div id="root"></div>'
    root = createRoot(document.querySelector('#root'))
    searchMock.mockResolvedValue({
      data: { items: [], params: { pagination: { currentPage: 2, pageCount: 2 } } },
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    vi.clearAllMocks()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })

  it('keeps dynamic metadata with one head owner', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/tim-kiem?keyword=matrix&page=2']}>
          <SearchPage />
        </MemoryRouter>,
      )
    })

    expect(document.title).toBe('Tìm kiếm: matrix - Trang 2 - WebPhim')
    expect(metaContent('meta[name="description"]')).toContain('"matrix"')
    expect(metaContent('meta[name="robots"]')).toBe('noindex, follow')
    expect(metaContent('meta[property="og:title"]')).toBe(document.title)
    expect(document.head.querySelector('link[rel="canonical"]').href).toBe('http://localhost:5173/tim-kiem')
    expect(organizationCount()).toBe(1)
  })
})
