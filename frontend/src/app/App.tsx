import { Component, ReactNode, useEffect, ErrorInfo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'

// Error Boundary to catch runtime errors
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'system-ui' }}>
          <h1 style={{ color: '#dc2626', marginBottom: 16 }}>Something went wrong</h1>
          <pre style={{ background: '#fef2f2', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 14 }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12, marginTop: 8 }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import AppLayout from '@/components/layout/AppLayout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import GoogleCallbackPage from '@/pages/auth/GoogleCallbackPage'
import ProfilePage from '@/pages/auth/ProfilePage'
import OnboardingPage from '@/pages/auth/OnboardingPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import LeadsPage from '@/pages/leads/LeadsPage'
import ContactsPage from '@/pages/contacts/ContactsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import PipelinePage from '@/pages/pipeline/PipelinePage'
import TasksPage from '@/pages/tasks/TasksPage'
import VisitsPage from '@/pages/visits/VisitsPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import ReportBuilderPage from '@/pages/reports/ReportBuilderPage'
import AuditLogsPage from '@/pages/audit/AuditLogsPage'
import FinancePage from '@/pages/finance/FinancePage'
import CostSheetsPage from '@/pages/finance/CostSheetsPage'
import QuotationsPage from '@/pages/finance/QuotationsPage'
import BookingsPage from '@/pages/finance/BookingsPage'
import InvoicesPage from '@/pages/finance/InvoicesPage'
import PaymentsPage from '@/pages/finance/PaymentsPage'
import ProjectsPage from '@/pages/projects/ProjectsPage'
import ProjectDetailsPage from '@/pages/projects/ProjectDetailsPage'
import QuotationPreviewPage from '@/pages/finance/QuotationPreviewPage'
import SharedQuotationPage from '@/pages/finance/SharedQuotationPage'
import AcceptInvitePage from '@/pages/auth/AcceptInvitePage'
import BillingPage from '@/pages/billing/BillingPage'
import { useAuthStore } from '@/app/store'
import { usersApi } from '@/services/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, membership } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If no membership, redirect to onboarding
  if (!membership) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function LandingRoute() {
  const { isAuthenticated, membership } = useAuthStore()

  if (isAuthenticated && membership) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage />
}

function App() {
  const { isAuthenticated, setMembership } = useAuthStore()

  // Check membership on app load
  useEffect(() => {
    if (isAuthenticated) {
      usersApi.getMembership()
        .then((res) => setMembership(res.data))
        .catch(() => {
          // No membership yet - will redirect to onboarding
        })
    }
  }, [isAuthenticated, setMembership])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<LandingRoute />} />
            
            {/* Auth routes */}
            <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
            <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/invite/:token" element={<AcceptInvitePage />} />
            <Route path="/quotation/share/:token" element={<SharedQuotationPage />} />
            
            {/* Protected app routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="leads" element={<LeadsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="visits" element={<VisitsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/builder" element={<ReportBuilderPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="finance/cost-sheets" element={<CostSheetsPage />} />
              <Route path="finance/quotations" element={<QuotationsPage />} />
              <Route path="finance/quotations/preview/:quotationId" element={<QuotationPreviewPage />} />
              <Route path="finance/bookings" element={<BookingsPage />} />
              <Route path="finance/invoices" element={<InvoicesPage />} />
              <Route path="finance/payments" element={<PaymentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/billing" element={<BillingPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
