import { beforeEach, describe, expect, it, vi } from 'vitest'

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('OPhim API cache', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('shares one in-flight request between prefetch and navigation', async () => {
    let resolveRequest
    const pending = new Promise((resolve) => {
      resolveRequest = resolve
    })
    const fetchMock = vi.fn(() => pending)
    vi.stubGlobal('fetch', fetchMock)

    const { ophimApi, prefetchMovie } = await import('./api.js')
    const prefetch = prefetchMovie('demo')
    const navigation = ophimApi.movie('demo')
    resolveRequest(response({ data: { item: { slug: 'demo' } } }))

    await expect(Promise.all([prefetch, navigation])).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reuses a fresh response without another network request', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response({ data: { items: [] } })))
    vi.stubGlobal('fetch', fetchMock)
    const { ophimApi } = await import('./api.js')

    await ophimApi.home()
    await ophimApi.home()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not bypass the backend when direct fallback is disabled', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response({ error: 'UPSTREAM' }, 503)))
    vi.stubGlobal('fetch', fetchMock)
    const { ophimApi } = await import('./api.js')

    await expect(ophimApi.home()).rejects.toMatchObject({ status: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
