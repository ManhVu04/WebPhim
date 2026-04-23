import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiLogin, apiRegister, apiGetMe, apiRefreshToken } from './authApi.js';

const AuthContext = createContext(null);

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

        // Verify access token with backend
        apiGetMe(accessToken).then((userData) => {
          if (userData && userData.username) {
            // Token is valid, restore session
            setAccessToken(accessToken);
            setRefreshToken(storedRefreshToken);
            setUser(userData);
          } else {
            // Token invalid/expired, try refresh
            return apiRefreshToken(storedRefreshToken);
          }
        }).then((refreshed) => {
          if (refreshed && refreshed.accessToken) {
            // Refresh successful, update session
            const newAuthData = {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              user: { id: refreshed.id, username: refreshed.username, displayName: refreshed.displayName },
            };
            sessionStorage.setItem('webphim_auth', JSON.stringify(newAuthData));
            setAccessToken(refreshed.accessToken);
            setRefreshToken(refreshed.refreshToken);
            setUser(newAuthData.user);
          } else {
            // Both tokens invalid, clear session
            sessionStorage.removeItem('webphim_auth');
          }
        }).catch(() => {
          // Token verification failed, clear session
          sessionStorage.removeItem('webphim_auth');
        }).finally(() => {
          setLoading(false);
        });
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
      user: { id: data.id, username: data.username, displayName: data.displayName },
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

  const register = useCallback(async (username, password, displayName) => {
    const data = await apiRegister(username, password, displayName);
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
