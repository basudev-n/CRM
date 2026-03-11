import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, TrendingUp, AlertCircle, CreditCard, FileText, Receipt } from "lucide-react"

export default function FinancePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: stats, isLoading } = useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: () => api.get("/finance/dashboard").then((res) => res.data),
  })

  const { data: overdueInvoices } = useQuery({
    queryKey: ["finance-overdue-invoices"],
    queryFn: () => api.get("/finance/overdue-invoices?per_page=5").then((res) => res.data),
  })

  const checkOverdueMutation = useMutation({
    mutationFn: () => api.post("/finance/overdue/check"),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["finance-overdue-invoices"] })
      const result = res.data
      toast({
        title: "Overdue sync complete",
        description: `Marked overdue: ${result.marked_overdue}, notifications: ${result.notifications_created}`,
      })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to run overdue check" })
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Revenue <span className="font-semibold">Finance</span>
          </h1>
          <p className="text-zinc-500 mt-2">Monitor receivables, collections, and overdue risk in one place.</p>
        </div>
        <div className="flex justify-end">
          <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => checkOverdueMutation.mutate()} disabled={checkOverdueMutation.isPending}>
            {checkOverdueMutation.isPending ? "Checking..." : "Run Overdue Check"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-500">Total Receivables</p>
            <div className="h-9 w-9 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-zinc-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(stats?.total_receivables || 0)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-500">Collected</p>
            <div className="h-9 w-9 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(stats?.collected_amount || 0)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-500">Overdue</p>
            <div className="h-9 w-9 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats?.overdue_amount || 0)}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-500">Collection Efficiency</p>
            <div className="h-9 w-9 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-zinc-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats?.collection_efficiency || 0}%</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats?.total_bookings || 0}</p>
              <p className="text-sm text-zinc-500">Total Bookings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats?.total_invoices || 0}</p>
              <p className="text-sm text-zinc-500">Total Invoices</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats?.total_payments || 0}</p>
              <p className="text-sm text-zinc-500">Total Payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Debtors */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold text-zinc-900">Top Debtors</h3>
        </div>
        <div className="px-6 pb-6">
          {stats?.top_debtors?.length > 0 ? (
            <div className="space-y-4">
              {stats.top_debtors.map((debtor: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div>
                    <p className="font-medium">{debtor.customer_name}</p>
                    <p className="text-sm text-zinc-500">
                      {debtor.project_name} - {debtor.unit_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(debtor.balance_amount)}</p>
                    <p className="text-sm text-zinc-500">Outstanding</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-4">No outstanding balances</p>
          )}
        </div>
      </div>

      {/* Recent Collections */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold text-zinc-900">Recent Collections</h3>
        </div>
        <div className="px-6 pb-6">
          {stats?.recent_collections?.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_collections.map((collection: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div>
                    <p className="font-medium">{collection.customer_name}</p>
                    <p className="text-sm text-zinc-500">{collection.payment_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(collection.amount)}</p>
                    <p className="text-sm text-zinc-500">
                      {collection.payment_date && new Date(collection.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-4">No recent collections</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold text-zinc-900">Overdue Invoices</h3>
        </div>
        <div className="px-6 pb-6">
          {overdueInvoices?.data?.length > 0 ? (
            <div className="space-y-3">
              {overdueInvoices.data.map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-zinc-500">{invoice.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">{formatCurrency(invoice.balance_amount || 0)}</p>
                    <p className="text-xs text-zinc-500">Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-4">No overdue invoices</p>
          )}
        </div>
      </div>
    </div>
  )
}
