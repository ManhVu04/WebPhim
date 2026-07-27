/**
 * Authentication API and in-memory session store.
 *
 * Access tokens never enter Web Storage. The refresh token is an HttpOnly
 * cookie managed by the backend and is therefore unavailable to JavaScript.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/api\/ophim$/, '') || ''
const sessionListeners = new Set()

let authSession = { accessToken: null, user: null }
let refreshPromise = null

export class ApiError extends Error {
  constructor(message, status, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function errorMessage(data, fallback) {
  return data?.message || data?.error || fallback
}

async function parseApiResponse(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function userFromResponse(data) {
  if (!data?.username) return null
  return {
    id: data.id,
    username: data.username,
    displayName: data.displayName,
    email: data.email,
    emailVerified: data.emailVerified,
  }
}

function publishSession(data) {
  authSession = data?.accessToken
    ? { accessToken: data.accessToken, user: userFromResponse(data) }
    : { accessToken: null, user: null }
  sessionListeners.forEach((listener) => listener(authSession))
  return authSession
}

export function subscribeAuthSession(listener) {
  sessionListeners.add(listener)
  listener(authSession)
  return () => sessionListeners.delete(listener)
}

export function clearAuthSession() {
  publishSession(null)
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isAccessTokenExpiring(token) {
  const exp = decodeJwtPayload(token)?.exp
  return !exp || exp * 1000 <= Date.now() + 30_000
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const data = await parseApiResponse(res)
  if (!res.ok) {
    throw new ApiError(errorMessage(data, `HTTP ${res.status}`), res.status, data.error)
  }
  return data
}

export async function apiLogin(username, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  publishSession(data)
  return data
}

export async function apiRegister(username, email, password, displayName) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, displayName }),
  })
  publishSession(data)
  return data
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = request('/api/auth/refresh', { method: 'POST' })
      .then((data) => {
        publishSession(data)
        return data
      })
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
          clearAuthSession()
        }
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function apiGetMe() {
  return authFetch('/api/auth/me')
}

export async function apiLogout() {
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } finally {
    clearAuthSession()
  }
}

export async function apiChangePassword(currentPassword, newPassword) {
  return authFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function apiRevokeAllSessions() {
  const data = await authFetch('/api/auth/sessions/revoke', { method: 'POST' })
  clearAuthSession()
  return data
}

export async function apiForgotPassword(email) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function apiResetPassword(token, newPassword) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function apiVerifyEmail(token) {
  return request(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
}

export async function apiResendEmailVerification() {
  return authFetch('/api/auth/email/verification/resend', { method: 'POST' })
}

/**
 * Authenticated request with a single refresh-and-retry attempt.
 * Only same-origin relative API paths are accepted to prevent bearer leakage.
 */
export async function authFetch(path, options = {}) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError('authFetch only accepts same-origin relative paths')
  }

  if (authSession.accessToken && isAccessTokenExpiring(authSession.accessToken)) {
    await refreshSession()
  }

  const doFetch = (token) => fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  let res = await doFetch(authSession.accessToken)
  if (res.status === 401) {
    try {
      await refreshSession()
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
        throw new ApiError('Session expired', 401, 'UNAUTHORIZED')
      }
      throw error
    }
    res = await doFetch(authSession.accessToken)
  }

  const data = await parseApiResponse(res)
  if (res.status === 401) {
    clearAuthSession()
    throw new ApiError(errorMessage(data, 'Session expired'), 401, 'UNAUTHORIZED')
  }
  if (!res.ok) {
    throw new ApiError(errorMessage(data, `HTTP ${res.status}`), res.status, data.error)
  }
  return data
}
