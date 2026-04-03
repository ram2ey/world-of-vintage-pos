import axios from 'axios'
import { useAuthStore } from '../stores/auth.store'

// In production VITE_API_URL points to the Railway backend (e.g. https://wov-api.up.railway.app)
// In dev, we use the Vite proxy so baseURL is just /api/v1
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request: attach access token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: silent token refresh on 401 ─────────────────────────────────────
let isRefreshing = false
let queue: Array<(token: string) => void> = []

function drainQueue(token: string) {
  queue.forEach((cb) => cb(token))
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Don't try to refresh on the refresh endpoint itself
    if (original.url === '/auth/refresh') {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Park this request until the in-flight refresh resolves
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) throw new Error('no refresh token')

      const { data } = await axios.post<{ data: { accessToken: string } }>(
        '/api/v1/auth/refresh',
        { refreshToken }
      )
      const newToken = data.data.accessToken
      useAuthStore.getState().setAccessToken(newToken)
      drainQueue(newToken)

      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
