import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api, { setTokens, clearTokens } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data)
      localStorage.setItem('citsx_user', JSON.stringify(data))
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const hasToken = !!localStorage.getItem('citsx_access_token')
    if (hasToken) {
      loadMe()
    } else {
      setLoading(false)
    }
  }, [loadMe])

  async function login(email, password) {
    const { data } = await api.post('/api/auth/login', { email, password })
    setTokens(data)
    await loadMe()
    return data
  }

  async function register(payload) {
    const { data } = await api.post('/api/auth/register', payload)
    return data
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {
      /* best-effort */
    }
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
