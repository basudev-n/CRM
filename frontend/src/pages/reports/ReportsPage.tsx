import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { reportsApi } from "@/services/api"
import { BarChart3, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { toast } = useToast()

  const { data: leadFunnel } = useQuery({
    queryKey: ["reports-lead-funnel"],
    queryFn: () => reportsApi.getLeadFunnel().then((res) => res.data),
  })

  const { data: sourcePerformance } = useQuery({
    queryKey: ["reports-source-performance"],
    queryFn: () => reportsApi.getSourcePerformance().then((res) => res.data),
  })

  const { data: agentPerformance } = useQuery({
    queryKey: ["reports-agent-performance"],
    queryFn: () => reportsApi.getAgentPerformance().then((res) => res.data),
  })

  const { data: salesSummary } = useQuery({
    queryKey: ["reports-sales-summary", dateFrom, dateTo],
    queryFn: () => reportsApi.getSalesSummary({ date_from: dateFrom || undefined, date_to: dateTo || undefined }).then((res) => res.data),
  })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0)

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleExportLeads = async () => {
    try {
      const res = await reportsApi.exportLeads()
      downloadBlob(new Blob([res.data], { type: "text/csv" }), "leads_export.csv")
    } catch {
      toast({ variant: "destructive", title: "Failed to export leads" })
    }
  }

  const handleExportContacts = async () => {
    try {
      const res = await reportsApi.exportContacts()
      downloadBlob(new Blob([res.data], { type: "text/csv" }), "contacts_export.csv")
    } catch {
      toast({ variant: "destructive", title: "Failed to export contacts" })
    }
  }

  const maxSource = Math.max(1, ...(sourcePerformance?.data || []).map((s: any) => s.total))

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Analytics <span className="font-semibold">Reports</span>
          </h1>
          <p className="text-zinc-500 mt-2">Track funnel, source ROI, and team performance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full border-zinc-300 hover:bg-zinc-100" onClick={handleExportLeads}>
            <Download className="mr-2 h-4 w-4" />
            Export Leads
          </Button>
          <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={handleExportContacts}>
            <Download className="mr-2 h-4 w-4" />
            Export Contacts
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Sales Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Date From</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
          <div className="grid md:grid-cols-5 gap-3">
            <div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50"><p className="text-xs text-zinc-500">Bookings</p><p className="text-xl font-semibold">{salesSummary?.bookings || 0}</p></div>
            <div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50"><p className="text-xs text-zinc-500">Booking Value</p><p className="text-xl font-semibold">{formatCurrency(salesSummary?.booking_value || 0)}</p></div>
            <div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50"><p className="text-xs text-zinc-500">Invoiced</p><p className="text-xl font-semibold">{formatCurrency(salesSummary?.invoiced_amount || 0)}</p></div>
            <div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50"><p className="text-xs text-zinc-500">Collected</p><p className="text-xl font-semibold">{formatCurrency(salesSummary?.collected_amount || 0)}</p></div>
            <div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50"><p className="text-xs text-zinc-500">Outstanding</p><p className="text-xl font-semibold">{formatCurrency(salesSummary?.outstanding_amount || 0)}</p></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="text-lg font-semibold text-zinc-900">Lead Funnel</h3>
          </div>
          <div className="p-6 space-y-3">
            {Object.entries(leadFunnel?.funnel || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-2 rounded-2xl bg-zinc-50 border border-zinc-200">
                <p className="text-sm capitalize">{key.replace("_", " ")}</p>
                <p className="font-medium">{value as number}</p>
              </div>
            ))}
            <div className="pt-2 text-sm text-zinc-600">
              Conversion Rate: <span className="font-semibold text-zinc-900">{leadFunnel?.conversion_rate || 0}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Source Performance</h3>
          </div>
          <div className="p-6 space-y-3">
            {(sourcePerformance?.data || []).slice(0, 8).map((row: any) => (
              <div key={row.source} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{row.source}</span>
                  <span>{row.total} leads • {row.conversion_rate}%</span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: `${(row.total / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Agent Performance</h3>
        </div>
        <div className="p-6">
          <div className="divide-y rounded-2xl border border-zinc-200">
            {(agentPerformance?.data || []).map((row: any) => (
              <div key={row.user_id} className="p-3 flex items-center justify-between bg-white">
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-zinc-500">{row.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Leads: <span className="font-medium">{row.total_leads}</span></p>
                  <p className="text-sm">Won: <span className="font-medium">{row.won_leads}</span> • {row.conversion_rate}%</p>
                </div>
              </div>
            ))}
            {(agentPerformance?.data || []).length === 0 && (
              <div className="p-6 text-center text-zinc-500">No agent performance data yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
