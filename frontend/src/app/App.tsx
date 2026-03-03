import { ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import OnboardingPage from '@/pages/auth/OnboardingPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import LeadsPage from '@/pages/leads/LeadsPage'
import ContactsPage from '@/pages/contacts/ContactsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import PipelinePage from '@/pages/pipeline/PipelinePage'
import TasksPage from '@/pages/tasks/TasksPage'
import VisitsPage from '@/pages/visits/VisitsPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import FinancePage from '@/pages/finance/FinancePage'
import BookingsPage from '@/pages/finance/BookingsPage'
import InvoicesPage from '@/pages/finance/InvoicesPage'
import PaymentsPage from '@/pages/finance/PaymentsPage'
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
    return <Navigate to="/" replace />
  }

  return <>{children}</>
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="visits" element={<VisitsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="finance/bookings" element={<BookingsPage />} />
            <Route path="finance/invoices" element={<InvoicesPage />} />
            <Route path="finance/payments" element={<PaymentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
