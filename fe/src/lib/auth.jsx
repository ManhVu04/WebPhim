import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  apiLogin,
  apiLogout,
  apiRegister,
  clearAuthSession,
  refreshSession,
  subscribeAuthSession,
} from './authApi.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeAuthSession((session) => {
      if (active) setUser(session.user)
    })

    refreshSession()
      .catch(() => {
        // A missing/expired cookie means the visitor is signed out. Network and
        // server failures do not need to destroy a previously established session.
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const login = useCallback((username, password) => apiLogin(username, password), [])

  const register = useCallback(
    (username, email, password, displayName) => apiRegister(username, email, password, displayName),
    [],
  )

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      clearAuthSession()
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(user),
  }), [user, loading, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
