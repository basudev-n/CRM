import { Link, useLocation, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/app/store"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Kanban,
  CheckSquare,
  Calendar,
  Bell,
  FileText,
  Receipt,
  CreditCard,
  Settings,
  LogOut,
  Building2,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Contacts", href: "/contacts", icon: UserPlus },
  { name: "Pipeline", href: "/pipeline", icon: Kanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Site Visits", href: "/visits", icon: Calendar },
  { name: "Notifications", href: "/notifications", icon: Bell },
]

const financeNavigation = [
  { name: "Cost Sheets", href: "/finance", icon: FileText },
  { name: "Bookings", href: "/finance/bookings", icon: Building2 },
  { name: "Invoices", href: "/finance/invoices", icon: Receipt },
  { name: "Payments", href: "/finance/payments", icon: CreditCard },
]

export default function AppLayout() {
  const location = useLocation()
  const { user, membership, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">PropFlow</span>
            </div>

            <div className="flex items-center gap-4">
              {membership && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">{membership.organisation.name}</span>
                </div>
              )}

              <Link to="/notifications">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>

              <div className="flex items-center gap-2 pl-4 border-l">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.first_name?.[0] || "U"}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">{user?.first_name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 py-6">
          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}

            <div className="pt-4 mt-4 border-t">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase mb-2">Finance</p>
              {financeNavigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-emerald-50 text-emerald-600"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            <div className="pt-4 mt-4 border-t">
              <Link
                to="/settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  location.pathname === "/settings"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 mt-1"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
