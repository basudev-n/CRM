import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist"
import { TrialDashboardWidget, UsageStatsWidget } from "@/components/billing/TrialDashboardWidget"
import { dashboardApi, leadsApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  Users,
  TrendingUp,
  UserPlus,
  DollarSign,
  CheckSquare,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Plus,
  Clock,
  Calendar,
  Building2,
  FileText,
  Target,
  Activity,
  Zap,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import { Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"

const COLORS = ["#18181b", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"]

const stageColorMap: Record<string, string> = {
  new: "#18181b",
  contacted: "#52525b",
  "site visit scheduled": "#71717a",
  "site visited": "#a1a1aa",
  negotiation: "#3f3f46",
  booking: "#27272a",
  won: "#18181b",
  lost: "#d4d4d8",
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats().then((res) => res.data),
  })

  const { data: enhancedStats } = useQuery({
    queryKey: ["dashboard-enhanced-stats"],
    queryFn: () => dashboardApi.getEnhancedStats().then((res) => res.data),
  })

  const { data: recentLeads } = useQuery({
    queryKey: ["recent-leads"],
    queryFn: () => leadsApi.list({ per_page: 5 }).then((res) => res.data),
  })

  const stageCounts = stats?.stage_counts || []
  const totalStageLeads = stageCounts.reduce((sum: number, stage: any) => sum + (stage.count || 0), 0) || 1
  const leadTrend = stats?.lead_trend || []
  const monthlyTrend = enhancedStats?.monthly_trend || []
  const leadSources = enhancedStats?.lead_sources || []

  const weekChange = leadTrend.length >= 2
    ? ((leadTrend[leadTrend.length - 1]?.count || 0) - (leadTrend[leadTrend.length - 2]?.count || 0))
    : 0

  const wonShare = stats?.leads?.total ? Math.min(100, Math.round((stats.leads.won / stats.leads.total) * 100)) : 0

  const trendChartData = leadTrend.map((item: any) => ({
    name: item.day,
    leads: item.count,
  }))

  const stageChartData = stageCounts.map((stage: any) => ({
    name: stage.status || "Unknown",
    value: stage.count,
    color: stageColorMap[stage.status?.toLowerCase()] || "#a1a1aa",
  }))

  const sourceChartData = leadSources.map((source: any, idx: number) => ({
    name: source.source || "Direct",
    value: source.count,
    color: COLORS[idx % COLORS.length],
  }))

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      New: "bg-zinc-100 text-zinc-700",
      Contacted: "bg-zinc-200 text-zinc-800",
      "Site Visit Scheduled": "bg-zinc-100 text-zinc-700",
      "Site Visited": "bg-zinc-200 text-zinc-800",
      Negotiation: "bg-zinc-100 text-zinc-700",
      Won: "bg-emerald-100 text-emerald-700",
      Lost: "bg-red-100 text-red-700",
    }
    return colors[status] || "bg-zinc-100 text-zinc-700"
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-700",
      medium: "bg-amber-100 text-amber-700",
      low: "bg-emerald-100 text-emerald-700",
    }
    return colors[priority] || "bg-zinc-100 text-zinc-700"
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        <OnboardingChecklist />
        <TrialDashboardWidget />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400 mb-1">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          </p>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            {user?.first_name || "there"}
            {"'s "}
            <span className="font-semibold">Dashboard</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <Link to="/leads?action=new">
            <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-5 h-10">
              <Plus className="mr-2 h-4 w-4" />
              New Lead
            </Button>
          </Link>
          <Link to="/pipeline">
            <Button variant="outline" className="rounded-full px-5 h-10 border-zinc-300">
              <Eye className="mr-2 h-4 w-4" />
              Pipeline
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-zinc-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {weekChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span className={weekChange >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                {Math.abs(weekChange)}
              </span>
            </div>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{stats?.leads?.total || 0}</p>
          <p className="text-sm text-zinc-500 mt-1">Total Leads</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm text-emerald-600 font-medium">{wonShare}%</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{stats?.leads?.won || 0}</p>
          <p className="text-sm text-zinc-500 mt-1">Won Deals</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="h-11 w-11 rounded-2xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <Activity className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-3xl font-bold text-zinc-900">{stats?.leads?.in_pipeline || 0}</p>
          <p className="text-sm text-zinc-500 mt-1">In Pipeline</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-zinc-600" />
            </div>
            <Zap className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-3xl font-bold text-zinc-900">{stats?.contacts?.total || 0}</p>
          <p className="text-sm text-zinc-500 mt-1">Contacts</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Lead Activity</h3>
              <p className="text-sm text-zinc-500">Last 7 days trend</p>
            </div>
            <Link to="/reports" className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center">
              View Reports <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Area type="monotone" dataKey="leads" stroke="#18181b" strokeWidth={2} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <TrendingUp className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm">No activity data yet</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-900">Lead Sources</h3>
            <p className="text-sm text-zinc-500">Distribution by channel</p>
          </div>
          {sourceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sourceChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-sm text-zinc-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <Target className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm">No source data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline & Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Pipeline Stages</h3>
              <p className="text-sm text-zinc-500">{totalStageLeads} total leads</p>
            </div>
            <Link to="/pipeline" className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center">
              Open Pipeline <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          {stageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stageChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {stageChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-400">
              <p className="text-sm">Configure pipeline stages to activate</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-2">
          <div className="bg-white rounded-3xl p-5 border border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Tasks</p>
                <p className="text-2xl font-bold text-zinc-900">{enhancedStats?.tasks?.pending || 0}</p>
                <p className="text-xs text-zinc-400">pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Site Visits</p>
                <p className="text-2xl font-bold text-zinc-900">{enhancedStats?.visits?.today || 0}</p>
                <p className="text-xs text-zinc-400">today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Quotations</p>
                <p className="text-2xl font-bold text-zinc-900">{enhancedStats?.finance?.quotations || 0}</p>
                <p className="text-xs text-zinc-400">created</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Projects</p>
                <p className="text-2xl font-bold text-zinc-900">{enhancedStats?.projects?.active || 0}</p>
                <p className="text-xs text-zinc-400">active</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Recent Leads</h3>
              <p className="text-sm text-zinc-500">Latest prospects</p>
            </div>
            <Link to="/leads" className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="px-6 pb-6">
            {recentLeads?.data?.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.data.map((lead: any) => (
                  <Link
                    key={lead.id}
                    to={`/leads?id=${lead.id}`}
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-zinc-900 flex items-center justify-center text-white font-semibold text-sm">
                        {lead.name?.charAt(0) || "L"}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 group-hover:text-zinc-700 transition-colors">
                          {lead.name}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </span>
                          )}
                          {lead.source && (
                            <span className="text-xs px-2 py-0.5 bg-zinc-100 rounded-full">
                              {lead.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}
                      >
                        {lead.status}
                      </span>
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-zinc-200 mx-auto mb-3" />
                <p className="text-zinc-500 mb-4">No leads yet</p>
                <Link to="/leads?action=new">
                  <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-5">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Lead
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/leads?action=new"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 transition-colors text-white"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs font-medium">New Lead</span>
              </Link>
              <Link
                to="/contacts?action=new"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-700"
              >
                <UserPlus className="h-5 w-5" />
                <span className="text-xs font-medium">New Contact</span>
              </Link>
              <Link
                to="/tasks"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-700"
              >
                <CheckSquare className="h-5 w-5" />
                <span className="text-xs font-medium">Tasks</span>
              </Link>
              <Link
                to="/finance"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-700"
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-xs font-medium">Finance</span>
              </Link>
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">Upcoming Tasks</h3>
              <Link to="/tasks" className="text-zinc-400 hover:text-zinc-600">
                <MoreHorizontal className="h-5 w-5" />
              </Link>
            </div>
            {enhancedStats?.pending_tasks?.length > 0 ? (
              <div className="space-y-3">
                {enhancedStats.pending_tasks.slice(0, 3).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100"
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        task.priority === "high"
                          ? "bg-red-500"
                          : task.priority === "medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{task.title}</p>
                      <p className="text-xs text-zinc-500">
                        {task.due_date
                          ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true })
                          : "No due date"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckSquare className="h-10 w-10 text-zinc-200 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No upcoming tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion & Performance */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-zinc-900 rounded-3xl p-6 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-zinc-400 text-sm">Conversion Rate</p>
              <p className="text-4xl font-bold mt-1">{stats?.conversion_rate || 0}%</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Target className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats?.conversion_rate || 0)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            {stats?.leads?.won || 0} won out of {stats?.leads?.total || 0} leads
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-900">Performance Overview</h3>
            <p className="text-sm text-zinc-500">Key metrics summary</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-3xl font-bold text-zinc-900">{stats?.leads?.new_today || 0}</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">New Today</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-3xl font-bold text-zinc-900">{enhancedStats?.tasks?.overdue || 0}</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Overdue Tasks</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-3xl font-bold text-zinc-900">{enhancedStats?.visits?.upcoming || 0}</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Upcoming Visits</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-3xl font-bold text-zinc-900">{enhancedStats?.finance?.invoices || 0}</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Invoices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
