import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiLogin, apiRegister, apiGetMe, apiRefreshToken } from './authApi.js';

const AuthContext = createContext(null);

// Decode JWT payload without verification (for expiry check only)
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

// Check if token is expired (exp claim is Unix timestamp in seconds)
function isTokenExpired(exp) {
  if (!exp) return true;
  // Add 30s buffer to avoid edge cases near expiry
  return (exp * 1000) < (Date.now() - 30000);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // { id, username, displayName }
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);   // initial auth check

  // Persist tokens in sessionStorage (survives refresh, cleared on tab close)
  // Verify token with backend on app load to ensure it's still valid
  useEffect(() => {
    const saved = sessionStorage.getItem('webphim_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const accessToken = parsed.accessToken;
        const storedRefreshToken = parsed.refreshToken;

        // Check access token expiry locally first (avoid unnecessary API calls)
        const payload = decodeJwtPayload(accessToken);
        const expired = !payload || isTokenExpired(payload.exp);

        if (expired) {
          // Access token expired, try refresh
          apiRefreshToken(storedRefreshToken).then((refreshed) => {
            if (refreshed && refreshed.accessToken) {
              // Refresh successful, update session immediately
              const newAuthData = {
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
              user: {
                id: refreshed.id,
                username: refreshed.username,
                displayName: refreshed.displayName,
                email: refreshed.email,
                emailVerified: refreshed.emailVerified,
              },
              };
              sessionStorage.setItem('webphim_auth', JSON.stringify(newAuthData));
              setAccessToken(refreshed.accessToken);
              setRefreshToken(refreshed.refreshToken);
              setUser(newAuthData.user);
            } else {
              // Refresh failed, clear session
              sessionStorage.removeItem('webphim_auth');
            }
          }).catch(() => {
            // Refresh failed, clear session
            sessionStorage.removeItem('webphim_auth');
          }).finally(() => {
            setLoading(false);
          });
        } else {
          // Access token still valid, restore session (verify with backend in background)
          setAccessToken(accessToken);
          setRefreshToken(storedRefreshToken);
          if (parsed.user) {
            setUser(parsed.user);
          }
          // Verify with backend asynchronously
          apiGetMe(accessToken).then((userData) => {
            if (userData && userData.username) {
              // Token still valid, update user data if needed
              setUser(userData);
            } else {
              // Token actually invalid, clear session
              sessionStorage.removeItem('webphim_auth');
              setUser(null);
              setAccessToken(null);
              setRefreshToken(null);
            }
          }).catch(() => {
            // Verify failed, but token might still be valid - keep session
            // Will retry on next request via authFetch
          }).finally(() => {
            setLoading(false);
          });
        }
      } catch {
        sessionStorage.removeItem('webphim_auth');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const saveAuth = useCallback((data) => {
    const authData = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: {
        id: data.id,
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        emailVerified: data.emailVerified,
      },
    };
    sessionStorage.setItem('webphim_auth', JSON.stringify(authData));
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(authData.user);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    saveAuth(data);
    return data;
  }, [saveAuth]);

  const register = useCallback(async (username, email, password, displayName) => {
    const data = await apiRegister(username, email, password, displayName);
    saveAuth(data);
    return data;
  }, [saveAuth]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    sessionStorage.removeItem('webphim_auth');
  }, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  }), [user, accessToken, refreshToken, loading, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
