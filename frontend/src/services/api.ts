import axios from 'axios'
import { useAuthStore } from '@/app/store'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach auth token to requests
api.interceptors.request.use((config) => {
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
          originalRequest.headers = originalRequest.headers || {}
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
  // Google OAuth
  getGoogleAuthUrl: (redirectUri?: string) =>
    api.get('/auth/google/url', { params: { redirect_uri: redirectUri } }),
  googleCallback: (code: string, redirectUri?: string) =>
    api.post('/auth/google/callback', null, { params: { code, redirect_uri: redirectUri } }),
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
  updateMe: (data: { first_name?: string; last_name?: string; phone?: string }) =>
    api.patch('/users/me', data),
  getMembership: () => api.get('/users/me/membership'),
  list: () => api.get('/users/'),
  getOrgUsers: () => api.get('/users/'),
  updateRole: (userId: number, role: string) =>
    api.patch(`/users/${userId}/role?new_role=${role}`),
  deactivate: (userId: number) => api.delete(`/users/${userId}`),
  // Invite management
  getPendingInvites: () => api.get('/users/invites/pending'),
  cancelInvite: (inviteId: number) => api.delete(`/users/invites/${inviteId}`),
  validateInvite: (token: string) => api.get(`/users/invites/validate/${token}`),
  acceptInvite: (data: { invite_token: string; password: string; phone?: string }) =>
    api.post('/users/invites/accept', data),
  // Onboarding status
  getOnboardingStatus: () => api.get('/users/me/onboarding'),
  updateOnboardingStatus: (data: { has_seen_tour?: boolean; onboarding_dismissed?: boolean }) =>
    api.patch('/users/me/onboarding', null, { params: data }),
  recordFirstLogin: () => api.post('/users/me/first-login'),
}

// Contacts API
export const contactsApi = {
  list: (params?: { page?: number; per_page?: number; search?: string; contact_type?: string }) =>
    api.get('/contacts', { params }),
  get: (id: number) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: number, data: any) => api.patch(`/contacts/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
  getTimeline: (id: number) => api.get(`/activities/contact/${id}`),
  merge: (sourceId: number, targetId: number) => api.post('/contacts/merge', { source_id: sourceId, target_id: targetId }),
  importCsv: (data: FormData) => api.post('/contacts/import', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// Activities API
export const activitiesApi = {
  list: (params?: { page?: number; per_page?: number; lead_id?: number; contact_id?: number }) =>
    api.get('/activities', { params }),
  getLeadTimeline: (leadId: number) => api.get(`/activities/lead/${leadId}`),
  getContactTimeline: (contactId: number) => api.get(`/activities/contact/${contactId}`),
  create: (data: { lead_id?: number; contact_id?: number; activity_type: string; title: string; description?: string }) =>
    api.post('/activities', data),
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
  bulkAssign: (leadIds: number[], assignedTo: number) => api.post('/leads/bulk-assign', { lead_ids: leadIds, assigned_to: assignedTo }),
  getAging: () => api.get('/leads/aging'),
  getTimeline: (id: number, params?: { page?: number; per_page?: number }) => api.get(`/leads/${id}/timeline`, { params }),
}

// Notes API
export const notesApi = {
  list: (params: { lead_id?: number; contact_id?: number; page?: number; per_page?: number; pinned_only?: boolean }) =>
    api.get('/notes', { params }),
  create: (data: { lead_id?: number; contact_id?: number; content: string; is_pinned?: boolean; mentions?: string }) =>
    api.post('/notes', data),
}

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getEnhancedStats: () => api.get('/dashboard/enhanced-stats'),
  getActivity: (limit?: number) => api.get('/dashboard/activity', { params: { limit } }),
  getOnboardingProgress: () => api.get('/dashboard/onboarding-progress'),
}

// Reports API
export const reportsApi = {
  getLeadFunnel: () => api.get('/reports/lead-funnel'),
  getSourcePerformance: () => api.get('/reports/source-performance'),
  getAgentPerformance: () => api.get('/reports/agent-performance'),
  getSalesSummary: (params?: { date_from?: string; date_to?: string }) => api.get('/reports/sales-summary', { params }),
  exportLeads: () => api.get('/reports/export/leads', { responseType: 'blob' }),
  exportContacts: () => api.get('/reports/export/contacts', { responseType: 'blob' }),
  // Report Builder
  getEntities: () => api.get('/reports/builder/entities'),
  runReport: (config: any) => api.post('/reports/builder/run', config),
  exportReport: (config: any) => api.post('/reports/builder/export', config, { responseType: 'blob' }),
  // Templates
  getTemplates: () => api.get('/reports/templates'),
  getTemplate: (id: number) => api.get(`/reports/templates/${id}`),
  saveTemplate: (name: string, config: any) => api.post('/reports/templates', { name, config }),
  deleteTemplate: (id: number) => api.delete(`/reports/templates/${id}`),
}

// Billing API
export const billingApi = {
  getPlans: () => api.get('/billing/plans'),
  getSubscription: () => api.get('/billing/subscription'),
  createOrder: (plan: string, billingCycle: string) => api.post('/billing/create-order', { plan, billing_cycle: billingCycle }),
  verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; plan: string; billing_cycle?: string }) =>
    api.post('/billing/verify-payment', data),
  cancelSubscription: () => api.post('/billing/cancel'),
  getPaymentHistory: (params?: { page?: number; per_page?: number }) => api.get('/billing/payment-history', { params }),
}

// Audit Logs API
export const auditLogsApi = {
  list: (params?: { page?: number; per_page?: number; user_id?: number; action?: string; entity_type?: string }) =>
    api.get('/audit-logs', { params }),
}

// Finance API
export const financeApi = {
  // Cost sheets
  listCostSheets: (params?: { project_name?: string; unit_type?: string }) => api.get('/finance/cost-sheets', { params }),
  createCostSheet: (data: any) => api.post('/finance/cost-sheets', data),

  // Quotations
  listQuotations: (params?: { page?: number; per_page?: number; status_filter?: string; lead_id?: number }) =>
    api.get('/finance/quotations', { params }),
  createQuotation: (data: any) => api.post('/finance/quotations', data),
  updateQuotation: (quotationId: number, data: any) => api.patch(`/finance/quotations/${quotationId}`, data),
  downloadQuotationPdf: (quotationId: number) =>
    api.get(`/finance/quotations/${quotationId}/pdf`, { responseType: 'blob' }),
  getQuotation: (quotationId: number) => api.get(`/finance/quotations/${quotationId}`),
  createQuotationShare: (quotationId: number) => api.post(`/finance/quotations/${quotationId}/share`),
  getSharedQuotation: (token: string) => api.get(`/finance/quotation-share/${token}`),
  actionSharedQuotation: (token: string, payload: { action: string }) =>
    api.post(`/finance/quotation-share/${token}/action`, payload),
  convertQuotationToInvoice: (quotationId: number, data: any) =>
    api.post(`/finance/quotations/${quotationId}/invoice`, data),

  // Bookings
  listBookings: (params?: { page?: number; per_page?: number; status_filter?: string }) => api.get('/finance/bookings', { params }),
  createBooking: (data: any) => api.post('/finance/bookings', data),

  // Invoices
  listInvoices: (params?: { page?: number; per_page?: number; status_filter?: string }) => api.get('/finance/invoices', { params }),
  createInvoice: (data: any) => api.post('/finance/invoices', data),
  downloadInvoicePdf: (invoiceId: number) =>
    api.get(`/finance/invoices/${invoiceId}/pdf`, { responseType: 'blob' }),

  // Payments & schedule
  listPayments: (params?: { page?: number; per_page?: number; booking_id?: number }) => api.get('/finance/payments', { params }),
  createPayment: (data: any) => api.post('/finance/payments', data),
  listPaymentSchedule: (params?: { booking_id?: number; page?: number; per_page?: number }) =>
    api.get('/finance/payment-schedule', { params }),
  createPaymentSchedule: (data: any) => api.post('/finance/payment-schedule', data),

  // Dashboard & overdue
  dashboard: () => api.get('/finance/dashboard'),
  checkOverdue: () => api.post('/finance/overdue/check'),
  listOverdueInvoices: (params?: { page?: number; per_page?: number }) => api.get('/finance/overdue-invoices', { params }),
}

// Projects API
export const projectsApi = {
  list: (params?: { page?: number; per_page?: number; search?: string; status?: string; city?: string }) =>
    api.get('/projects', { params }),
  get: (id: number) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: number, data: any) => api.patch(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  uploadMedia: (projectId: number, mediaType: 'master_plan' | 'brochure' | 'gallery', file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/projects/${projectId}/upload`, formData, {
      params: { media_type: mediaType },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removeMedia: (projectId: number, mediaType: 'master_plan' | 'brochure' | 'gallery', fileUrl?: string) =>
    api.delete(`/projects/${projectId}/upload`, { params: { media_type: mediaType, file_url: fileUrl } }),
}

// Inventory API
export const inventoryApi = {
  // Towers
  listTowers: (projectId: number) => api.get('/inventory/towers', { params: { project_id: projectId } }),
  getTower: (id: number) => api.get(`/inventory/towers/${id}`),
  createTower: (data: any) => api.post('/inventory/towers', data),
  updateTower: (id: number, data: any) => api.patch(`/inventory/towers/${id}`, data),
  deleteTower: (id: number) => api.delete(`/inventory/towers/${id}`),

  // Units
  listUnits: (params?: {
    page?: number
    per_page?: number
    project_id?: number
    tower_id?: number
    status?: string
    unit_type?: string
    min_price?: number
    max_price?: number
  }) => api.get('/inventory/units', { params }),
  getUnit: (id: number) => api.get(`/inventory/units/${id}`),
  createUnit: (data: any) => api.post('/inventory/units', data),
  updateUnit: (id: number, data: any) => api.patch(`/inventory/units/${id}`, data),
  bulkCreateUnits: (towerId: number, units: any[]) => api.post('/inventory/units/bulk', { tower_id: towerId, units }),
  holdUnit: (id: number, hours?: number) => api.get(`/inventory/units/${id}/hold`, { params: { hours } }),
  releaseUnit: (id: number) => api.get(`/inventory/units/${id}/release`),
  importUnits: (towerId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/inventory/import-units', formData, {
      params: { tower_id: towerId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  floorSummary: (projectId: number, towerId?: number) =>
    api.get('/inventory/floor-summary', { params: { project_id: projectId, tower_id: towerId } }),
  downloadPriceList: async (projectId: number, towerId?: number) => {
    const response = await api.get('/inventory/price-list', {
      params: { project_id: projectId, tower_id: towerId, format: 'csv' },
      responseType: 'blob',
    })
    return response
  },
}

// Tasks API
export const tasksApi = {
  list: (params?: {
    page?: number
    per_page?: number
    my_tasks?: boolean
    today?: boolean
    overdue?: boolean
    status?: string
    priority?: string
  }) => api.get('/tasks', { params }),
  get: (id: number) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: number, data: any) => api.patch(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
}

// Visits API
export const visitsApi = {
  list: (params?: {
    page?: number
    per_page?: number
    status?: string
    agent_id?: number
    from_date?: string
    to_date?: string
  }) => api.get('/visits', { params }),
  get: (id: number) => api.get(`/visits/${id}`),
  create: (data: any) => api.post('/visits', data),
  update: (id: number, data: any) => api.patch(`/visits/${id}`, data),
  delete: (id: number) => api.delete(`/visits/${id}`),
  getCalendar: (params?: { agent_id?: number; from_date?: string; to_date?: string }) =>
    api.get('/visits/calendar', { params }),
  getSlots: (projectId?: number, date?: string) =>
    api.get('/visits/available-slots', { params: { project_id: projectId, date } }),
  checkConflicts: (agentId: number, scheduledDate: string) =>
    api.get('/visits/check-conflicts', { params: { agent_id: agentId, scheduled_date: scheduledDate } }),
}
