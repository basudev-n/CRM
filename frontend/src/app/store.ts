import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  first_name: string
  last_name?: string
  phone?: string
  avatar?: string
  is_email_verified: boolean
}

interface Organisation {
  id: number
  name: string
}

interface Membership {
  organisation: Organisation
  role: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  membership: Membership | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setMembership: (membership: Membership) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      membership: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setMembership: (membership) => set({ membership }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          membership: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'propflow-auth',
    }
  )
)
