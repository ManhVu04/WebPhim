// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authFetch } from '../../lib/authApi.js'
import { HistoryPage } from './HistoryPage.jsx'

vi.mock('../../lib/authApi.js', () => ({
  authFetch: vi.fn(),
}))

describe('HistoryPage resume link', () => {
  let root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    document.body.innerHTML = '<div id="root"></div>'
    root = createRoot(document.querySelector('#root'))
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    vi.mocked(authFetch).mockReset()
    document.body.innerHTML = ''
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })

  it('links directly to the saved server and episode', async () => {
    vi.mocked(authFetch).mockResolvedValue({
      items: [
        {
          id: 'history-1',
          movieSlug: 'demo',
          movieName: 'Demo movie',
          thumbUrl: 'https://ophim.live/demo-thumb.jpg',
          serverIndex: 2,
          episodeIndex: 7,
          episodeName: '8',
          watchedAt: '2026-07-30T00:00:00Z',
          progressSeconds: 120,
          durationSeconds: 600,
        },
      ],
      totalPages: 1,
      totalItems: 1,
      currentPage: 0,
    })

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/lich-su']}>
          <HistoryPage />
        </MemoryRouter>,
      )
    })

    expect(document.querySelector('a.movie-card')?.getAttribute('href'))
      .toBe('/xem/demo?server=2&ep=7')
  })
})
