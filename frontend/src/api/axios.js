import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: API_BASE_URL })

function getTokens() {
  return {
    access: localStorage.getItem('citsx_access_token'),
    refresh: localStorage.getItem('citsx_refresh_token'),
  }
}

export function setTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem('citsx_access_token', access_token)
  if (refresh_token) localStorage.setItem('citsx_refresh_token', refresh_token)
}

export function clearTokens() {
  localStorage.removeItem('citsx_access_token')
  localStorage.removeItem('citsx_refresh_token')
  localStorage.removeItem('citsx_user')
}

api.interceptors.request.use((config) => {
  const { access } = getTokens()
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { refresh } = getTokens()
      if (!refresh) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      try {
        // De-dupe concurrent refreshes.
        refreshPromise = refreshPromise || api.post('/api/auth/refresh', { refresh_token: refresh })
        const { data } = await refreshPromise
        refreshPromise = null
        setTokens(data)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch (refreshErr) {
        refreshPromise = null
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      }
    }
    return Promise.reject(error)
  },
)

export default api
