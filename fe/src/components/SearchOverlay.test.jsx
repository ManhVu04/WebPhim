// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchOverlay } from './SearchOverlay.jsx'

const searchMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/api.js', () => ({
  ophimApi: { search: searchMock },
}))

describe('SearchOverlay autocomplete', () => {
  let root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    document.body.innerHTML = '<div id="root"></div>'
    root = createRoot(document.querySelector('#root'))
    vi.useFakeTimers()
    searchMock.mockReset()
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    vi.useRealTimers()
    document.body.innerHTML = ''
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })

  async function renderSearch(query, onClose = vi.fn()) {
    const containerRef = { current: document.querySelector('#root') }

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SearchOverlay query={query} onClose={onClose} containerRef={containerRef} />
        </MemoryRouter>,
      )
    })

    return onClose
  }

  it('renders movie suggestions after the debounced search and can close the overlay', async () => {
    searchMock.mockResolvedValue({
      data: {
        APP_DOMAIN_CDN_IMAGE: 'https://img.example',
        items: [
          {
            _id: 'movie-1',
            slug: 'tham-tu-conan',
            name: 'Thám Tử Conan',
            origin_name: 'Detective Conan',
            thumb_url: 'conan.jpg',
            quality: 'HD',
            lang: 'Vietsub',
            year: 2005,
          },
          {
            _id: 'movie-2',
            slug: 'conan-vien-dan-do',
            name: 'Conan: Viên Đạn Đỏ',
            thumb_url: 'scarlet.jpg',
            quality: 'FHD',
            lang: 'Lồng Tiếng',
            year: 2021,
          },
        ],
        params: { pagination: { totalItems: 12 } },
      },
    })

    const onClose = await renderSearch('conan')

    expect(document.body.textContent).toContain('Đang tìm kiếm...')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(searchMock).toHaveBeenCalledWith(
      'conan',
      1,
      { signal: expect.any(AbortSignal) },
    )
    expect(document.body.textContent).toContain('Hiển thị 2 / 12 kết quả')
    expect(document.body.textContent).toContain('Thám Tử Conan')
    expect(document.querySelector('a[href="/phim/tham-tu-conan"]')).not.toBeNull()

    await act(async () => {
      document.querySelector('.search-overlay-close').click()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when the API returns no suggestions', async () => {
    searchMock.mockResolvedValue({
      data: {
        items: [],
        params: { pagination: { totalItems: 0 } },
      },
    })

    await renderSearch('khong-co-phim')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(document.body.textContent).toContain('Không tìm thấy kết quả')
    expect(document.querySelectorAll('.search-result-item')).toHaveLength(0)
  })
})
