import { beforeEach, describe, expect, it, vi } from 'vitest'

function jwt(label = 'token', expOffsetSeconds = 300) {
  const header = btoa(JSON.stringify({ alg: 'RS256' }))
  const payload = btoa(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    jti: label,
  }))
  return `${header}.${payload}.signature`
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('auth API session coordination', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('rotates one refresh cookie for concurrent 401 responses', async () => {
    const oldToken = jwt('old')
    const newToken = jwt('new')
    let refreshCalls = 0

    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({
          accessToken: oldToken,
          id: 'u1',
          username: 'demo',
          displayName: 'Demo',
        })
      }
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1
        return jsonResponse({
          accessToken: newToken,
          id: 'u1',
          username: 'demo',
          displayName: 'Demo',
        })
      }
      if (url.endsWith('/api/favorites')) {
        return options.headers.Authorization === `Bearer ${newToken}`
          ? jsonResponse({ items: [] })
          : jsonResponse({ error: 'UNAUTHORIZED' }, 401)
      }
      throw new Error(`Unexpected URL: ${url}`)
    }))

    const { apiLogin, authFetch } = await import('./authApi.js')
    await apiLogin('demo', 'correct horse battery staple')

    const results = await Promise.all(
      Array.from({ length: 5 }, () => authFetch('/api/favorites')),
    )

    expect(refreshCalls).toBe(1)
    expect(results).toEqual(Array.from({ length: 5 }, () => ({ items: [] })))
  })

  it('keeps the in-memory session on a transient server error', async () => {
    const accessToken = jwt('session')
    let protectedCalls = 0
    let latestSession = null

    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({
          accessToken,
          id: 'u1',
          username: 'demo',
          displayName: 'Demo',
        })
      }
      if (url.endsWith('/api/history')) {
        protectedCalls += 1
        if (protectedCalls === 1) return jsonResponse({ error: 'UPSTREAM' }, 503)
        expect(options.headers.Authorization).toBe(`Bearer ${accessToken}`)
        return jsonResponse({ items: [] })
      }
      throw new Error(`Unexpected URL: ${url}`)
    }))

    const { apiLogin, authFetch, subscribeAuthSession } = await import('./authApi.js')
    const unsubscribe = subscribeAuthSession((session) => {
      latestSession = session
    })
    await apiLogin('demo', 'correct horse battery staple')

    await expect(authFetch('/api/history')).rejects.toMatchObject({ status: 503 })
    await expect(authFetch('/api/history')).resolves.toEqual({ items: [] })
    expect(latestSession.user.username).toBe('demo')
    unsubscribe()
  })

  it('rejects absolute and protocol-relative URLs', async () => {
    const { authFetch } = await import('./authApi.js')

    await expect(authFetch('https://evil.example/api')).rejects.toThrow(TypeError)
    await expect(authFetch('//evil.example/api')).rejects.toThrow(TypeError)
  })
})
