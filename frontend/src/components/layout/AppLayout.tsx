import { Link, useLocation, Outlet } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/app/store"
import { Button } from "@/components/ui/button"
import { useSubscription } from "@/hooks/useSubscription"
import { TrialBanner, UpgradeNudge } from "@/components/billing/TrialBanner"
import FeatureTour from "@/components/onboarding/FeatureTour"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Kanban,
  CheckSquare,
  Calendar,
  Bell,
  BarChart3,
  Shield,
  FileText,
  Receipt,
  CreditCard,
  Settings,
  LogOut,
  Building2,
  User,
  Menu,
  X,
  Wand2,
  Clock,
  Sparkles,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, tourId: "dashboard" },
  { name: "Leads", href: "/leads", icon: Users, tourId: "leads" },
  { name: "Contacts", href: "/contacts", icon: UserPlus, tourId: "contacts" },
  { name: "Pipeline", href: "/pipeline", icon: Kanban, tourId: "pipeline" },
  { name: "Projects", href: "/projects", icon: Building2, tourId: "projects" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, tourId: "tasks" },
  { name: "Site Visits", href: "/visits", icon: Calendar, tourId: "visits" },
  { name: "Notifications", href: "/notifications", icon: Bell, tourId: "notifications" },
  { name: "Reports", href: "/reports", icon: BarChart3, tourId: "reports" },
  { name: "Report Builder", href: "/reports/builder", icon: Wand2, tourId: "report-builder" },
  { name: "Audit Logs", href: "/audit-logs", icon: Shield, tourId: "audit" },
]

const financeNavigation = [
  { name: "Dashboard", href: "/finance", icon: FileText, tourId: "finance" },
  { name: "Cost Sheets", href: "/finance/cost-sheets", icon: FileText, tourId: "cost-sheets" },
  { name: "Quotations", href: "/finance/quotations", icon: FileText, tourId: "quotations" },
  { name: "Bookings", href: "/finance/bookings", icon: Building2, tourId: "bookings" },
  { name: "Invoices", href: "/finance/invoices", icon: Receipt, tourId: "invoices" },
  { name: "Payments", href: "/finance/payments", icon: CreditCard, tourId: "payments" },
]

export default function AppLayout() {
  const location = useLocation()
  const { user, membership, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const orgMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Use subscription hook for trial state
  const { subscription, isOnTrial, trialDaysRemaining } = useSubscription()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (orgMenuRef.current && !orgMenuRef.current.contains(target)) {
        setOrgMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <FeatureTour />
      <UpgradeNudge />
      
      {/* Trial Banner - Shows at the very top */}
      <TrialBanner />

      {/* Top Navigation */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-zinc-900">PropFlow</span>
            </div>

            <div className="flex items-center gap-4">
              {membership && (
                <div ref={orgMenuRef} className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => {
                      setOrgMenuOpen((v) => !v)
                      setUserMenuOpen(false)
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full text-sm hover:bg-zinc-200 transition-colors"
                  >
                    <Building2 className="h-4 w-4 text-zinc-500" />
                    <span className="font-medium text-zinc-700">{membership?.organisation?.name || 'Organisation'}</span>
                  </button>
                  {orgMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white shadow-lg p-2 z-50">
                      <p className="px-2 py-1 text-xs text-zinc-500">Organisation</p>
                      <p className="px-2 pb-2 text-sm font-medium text-zinc-900 border-b border-zinc-100">{membership?.organisation?.name || 'Organisation'}</p>
                      <Link
                        to="/settings"
                        className="block mt-2 px-2 py-2 text-sm rounded-lg hover:bg-zinc-100"
                        onClick={() => setOrgMenuOpen(false)}
                      >
                        Organisation Settings
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-2 py-2 text-sm rounded-lg hover:bg-zinc-100"
                        onClick={() => setOrgMenuOpen(false)}
                      >
                        Team Members
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Trial Status Chip - Compact in header */}
              {isOnTrial && (
                <Link
                  to="/settings/billing"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-full text-sm hover:from-amber-200 hover:to-orange-200 transition-all group"
                >
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">
                    {trialDaysRemaining}d left
                  </span>
                  <span className="text-xs font-semibold text-amber-600 group-hover:text-amber-800 flex items-center">
                    Upgrade
                    <Sparkles className="h-3 w-3 ml-1" />
                  </span>
                </Link>
              )}

              <Link to="/notifications">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>

              <div ref={userMenuRef} className="relative pl-4 border-l border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((v) => !v)
                    setOrgMenuOpen(false)
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-sm font-medium">
                    {user?.first_name?.[0] || "U"}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-zinc-900">{user?.first_name}</p>
                  </div>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-zinc-200 bg-white shadow-lg p-2 z-50">
                    <p className="px-2 py-1 text-xs text-zinc-500">Signed in as</p>
                    <p className="px-2 pb-2 text-sm font-medium text-zinc-900 border-b border-zinc-100">{user?.email}</p>
                    <Link
                      to="/profile"
                      className="block mt-2 px-2 py-2 text-sm rounded-lg hover:bg-zinc-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-2 py-2 text-sm rounded-lg hover:bg-zinc-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        setLogoutDialogOpen(true)
                      }}
                      className="w-full text-left px-2 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
                </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white border-r border-zinc-200 py-4 overflow-y-auto">
              <div className="flex items-center justify-between px-4 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold">Menu</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Mobile Trial Status */}
              {isOnTrial && (
                <Link
                  to="/settings/billing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-3 mt-4 flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">FREE Trial</p>
                      <p className="text-xs text-amber-600">{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 flex items-center bg-amber-200/50 px-2 py-1 rounded-full">
                    Upgrade
                    <Sparkles className="h-3 w-3 ml-1" />
                  </span>
                </Link>
              )}
              
              <nav className="px-3 space-y-1 pt-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                        isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
                <div className="pt-4 mt-4 border-t border-zinc-200">
                  <p className="px-3 text-xs font-semibold text-zinc-400 uppercase mb-2">Finance</p>
                  {financeNavigation.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium",
                          isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
                <div className="pt-4 mt-4 border-t border-zinc-200">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                      location.pathname === "/profile" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                    )}
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                      location.pathname === "/settings" ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
                    )}
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setLogoutDialogOpen(true)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 mt-1"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </nav>
            </aside>
          </div>
        )}

        {/* Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 bg-white border-r border-zinc-200 py-6 flex-shrink-0">
          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-tour={item.tourId}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}

            <div className="pt-4 mt-4 border-t border-zinc-200">
              <p className="px-3 text-xs font-semibold text-zinc-400 uppercase mb-2">Finance</p>
              {financeNavigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    data-tour={item.tourId}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium",
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            <div className="pt-4 mt-4 border-t border-zinc-200">
              <Link
                to="/profile"
                data-tour="profile"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  location.pathname === "/profile"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                <User className="h-5 w-5" />
                Profile
              </Link>
              <Link
                to="/settings"
                data-tour="settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  location.pathname === "/settings"
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
              <Link
                to="/settings/billing"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  location.pathname === "/settings/billing"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                <CreditCard className="h-5 w-5" />
                Billing
              </Link>
              <button
                onClick={() => setLogoutDialogOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 mt-1"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of PropFlow?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLogoutDialogOpen(false)
                logout()
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
