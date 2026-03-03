import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, TrendingUp, AlertCircle, CreditCard, FileText, Receipt, Plus } from "lucide-react"

export default function FinancePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: stats, isLoading } = useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: () => api.get("/finance/dashboard").then((res) => res.data),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Track payments, invoices, and receivables</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.total_receivables || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.collected_amount || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats?.overdue_amount || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Efficiency</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.collection_efficiency || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_bookings || 0}</p>
                <p className="text-sm text-gray-500">Total Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_invoices || 0}</p>
                <p className="text-sm text-gray-500">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Receipt className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_payments || 0}</p>
                <p className="text-sm text-gray-500">Total Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Debtors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Debtors</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.top_debtors?.length > 0 ? (
            <div className="space-y-4">
              {stats.top_debtors.map((debtor: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{debtor.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {debtor.project_name} - {debtor.unit_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(debtor.balance_amount)}</p>
                    <p className="text-sm text-gray-500">Outstanding</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No outstanding balances</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Collections */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_collections?.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_collections.map((collection: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{collection.customer_name}</p>
                    <p className="text-sm text-gray-500">{collection.payment_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(collection.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {collection.payment_date && new Date(collection.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent collections</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
