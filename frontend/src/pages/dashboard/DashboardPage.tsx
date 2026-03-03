import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { dashboardApi, leadsApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import {
  Users,
  TrendingUp,
  UserPlus,
  DollarSign,
  CheckSquare,
  ArrowRight,
  Phone,
  Plus,
  Clock,
} from "lucide-react"
import { Link } from "react-router-dom"

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats().then((res) => res.data),
  })

  const { data: recentLeads } = useQuery({
    queryKey: ["recent-leads"],
    queryFn: () => leadsApi.list({ per_page: 5 }).then((res) => res.data),
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-700"
      case "Contacted":
        return "bg-yellow-100 text-yellow-700"
      case "Site Visit Scheduled":
        return "bg-purple-100 text-purple-700"
      case "Negotiation":
        return "bg-orange-100 text-orange-700"
      case "Won":
        return "bg-green-100 text-green-700"
      case "Lost":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.first_name || "User"}!</h1>
            <p className="text-indigo-100 mt-1">
              Here's what's happening with your pipeline today.
            </p>
          </div>
          <div className="hidden md:block">
            <Link to="/leads?action=new">
              <Button className="bg-white text-indigo-600 hover:bg-indigo-50">
                <Plus className="mr-2 h-4 w-4" />
                New Lead
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-indigo-900 mt-1">{stats?.leads?.total || 0}</p>
                <p className="text-xs text-indigo-500 mt-1">
                  +{stats?.leads?.new_today || 0} this week
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">In Pipeline</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{stats?.leads?.in_pipeline || 0}</p>
                <p className="text-xs text-amber-500 mt-1">
                  Active deals
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Won Deals</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats?.leads?.won || 0}</p>
                <p className="text-xs text-green-500 mt-1">
                  {stats?.conversion_rate || 0}% conversion
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Contacts</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{stats?.contacts?.total || 0}</p>
                <p className="text-xs text-purple-500 mt-1">
                  In database
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Leads */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Leads</CardTitle>
            <Link to="/leads" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads?.data?.length > 0 ? (
              <div className="space-y-4">
                {recentLeads.data.map((lead: any) => (
                  <Link
                    key={lead.id}
                    to={`/leads?id=${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-semibold">
                        {lead.name?.charAt(0) || "L"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No leads yet</p>
                <Link to="/leads?action=new">
                  <Button variant="outline" className="mt-3">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Lead
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  to="/leads?action=new"
                  className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors text-indigo-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">New Lead</span>
                </Link>
                <Link
                  to="/contacts?action=new"
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">New Contact</span>
                </Link>
                <Link
                  to="/pipeline"
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">View Pipeline</span>
                </Link>
                <Link
                  to="/finance"
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">Finance Dashboard</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">New Today</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.leads?.new_today || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <CheckSquare className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.conversion_rate || 0}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Pipeline Overview</CardTitle>
          <Link to="/pipeline" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
            Open Pipeline <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {["New", "Contacted", "Site Visit Scheduled", "Negotiation", "Won"].map((status) => {
              const count = status === "New" ? stats?.leads?.new_today :
                           status === "Won" ? stats?.leads?.won : 0
              const colors: Record<string, string> = {
                "New": "bg-blue-500",
                "Contacted": "bg-yellow-500",
                "Site Visit Scheduled": "bg-purple-500",
                "Negotiation": "bg-orange-500",
                "Won": "bg-green-500",
              }
              return (
                <div key={status} className="text-center p-4 rounded-xl bg-gray-50">
                  <div className={`w-3 h-3 rounded-full ${colors[status]} mx-auto mb-2`} />
                  <p className="text-2xl font-bold text-gray-900">{count || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{status}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
