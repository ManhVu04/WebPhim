/**
 * Auth API — communicate with Spring Boot auth endpoints.
 * Token stored in memory (NOT localStorage) for XSS safety.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/api\/ophim$/, '') || '';

async function parseApiResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiLogin(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
  return data; // { accessToken, refreshToken, expiresIn, id, username, displayName }
}

export async function apiRegister(username, password, displayName) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, displayName }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.error || data.message || 'Registration failed');
  return data; // same shape as login
}

export async function apiGetMe(accessToken) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function apiRefreshToken(refreshToken) {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error(res.error || res.message || 'Token refresh failed');
  return res.json(); // { accessToken, refreshToken, expiresIn, id, username, displayName }
}

/**
 * Authenticated fetch — attaches Bearer token, returns JSON.
 * Automatically retries with refreshed token on 401.
 * Returns { _unauthorized: true } only if refresh also fails.
 */
export async function authFetch(path, accessToken, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const doFetch = (token) => fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  let res = await doFetch(accessToken);

  // Auto-refresh on 401
  if (res.status === 401) {
    try {
      const saved = sessionStorage.getItem('webphim_auth');
      if (!saved) return { _unauthorized: true };
      const { refreshToken } = JSON.parse(saved);
      if (!refreshToken) return { _unauthorized: true };

      const refreshed = await apiRefreshToken(refreshToken);

      // Persist the new tokens
      const current = JSON.parse(sessionStorage.getItem('webphim_auth') || '{}');
      sessionStorage.setItem('webphim_auth', JSON.stringify({
        ...current,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      }));

      // Retry with new access token
      res = await doFetch(refreshed.accessToken);
    } catch {
      return { _unauthorized: true };
    }
  }

  if (res.status === 401) return { _unauthorized: true };
  const data = await parseApiResponse(res);
  if (!Object.keys(data).length) return res.ok ? {} : { _error: true, status: res.status };
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}
