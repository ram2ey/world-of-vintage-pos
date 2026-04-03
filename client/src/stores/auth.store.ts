import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Staff, AuthTokens } from '@world-of-vintage/shared'

interface AuthState {
  staff: Staff | null
  accessToken: string | null
  refreshToken: string | null
  login: (staff: Staff, tokens: AuthTokens) => void
  logout: () => void
  setAccessToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      staff: null,
      accessToken: null,
      refreshToken: null,
      login: (staff, tokens) =>
        set({ staff, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      logout: () => set({ staff: null, accessToken: null, refreshToken: null }),
      setAccessToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'wov-auth',
      // Persist staff identity and refresh token across page reloads.
      // Access token is short-lived and re-issued by the refresh interceptor.
      partialize: (state) => ({
        staff: state.staff,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
