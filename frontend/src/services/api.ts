import axios from 'axios'
import { useAuthStore } from '@/app/store'

const API_URL = 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add trailing slash to all requests to avoid 307 redirect
api.interceptors.request.use((config) => {
  if (config.url && !config.url.endsWith('/')) {
    config.url = config.url + '/'
  }
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = useAuthStore.getState().refreshToken

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const { access_token, refresh_token } = response.data
          const user = useAuthStore.getState().user
          if (user) {
            useAuthStore.getState().setAuth(user, access_token, refresh_token)
          }
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  signup: (data: { email: string; otp: string; password: string; first_name: string; last_name?: string; phone?: string }) =>
    api.post('/auth/signup', data),
  sendOtp: (data: { email: string }) =>
    api.post('/auth/signup/initiate', data),
  verifyOtp: (data: { email: string; otp: string }) =>
    api.post('/auth/signup/verify', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  me: (token?: string) => token
    ? api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    : api.get('/auth/me'),
}

// Organisation API
export const orgApi = {
  create: (data: { name: string; type: string; rera_number?: string }) =>
    api.post('/organisations', data),
  getMe: () => api.get('/organisations/me'),
  getMembers: () => api.get('/organisations/me/members'),
}

// Users API
export const usersApi = {
  invite: (data: { email: string; role: string; first_name: string; last_name?: string }) =>
    api.post('/users/invite', data),
  getMe: () => api.get('/users/me'),
  getMembership: () => api.get('/users/me/membership'),
  list: () => api.get('/users/'),
  getOrgUsers: () => api.get('/users/org-users'),
  updateRole: (userId: number, role: string) =>
    api.patch(`/users/${userId}/role?new_role=${role}`),
  deactivate: (userId: number) => api.delete(`/users/${userId}`),
}

// Contacts API
export const contactsApi = {
  list: (params?: { page?: number; per_page?: number; search?: string; contact_type?: string }) =>
    api.get('/contacts', { params }),
  get: (id: number) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: number, data: any) => api.patch(`/contacts/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
}

// Leads API
export const leadsApi = {
  list: (params?: {
    page?: number
    per_page?: number
    search?: string
    source?: string
    priority?: string
    status?: string
    assigned_to?: number
  }) => api.get('/leads', { params }),
  get: (id: number) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: number, data: any) => api.patch(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
  getSources: () => api.get('/leads/sources/list'),
}

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: (limit?: number) => api.get('/dashboard/activity', { params: { limit } }),
}
