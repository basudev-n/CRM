import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Plus, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react"

export default function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    booking_id: "",
    invoice_date: "",
    due_date: "",
    milestone_name: "",
    milestone_percentage: "",
    notes: "",
  })
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: bookingsData } = useQuery({
    queryKey: ["bookings-list"],
    queryFn: () => api.get(`/finance/bookings?per_page=100`).then((res) => res.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get(`/finance/invoices?page=${page}&per_page=20`).then((res) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/finance/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      setShowCreateModal(false)
      toast({ title: "Invoice created successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create invoice", description: error.response?.data?.detail || "Unknown error" })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      booking_id: parseInt(formData.booking_id),
      invoice_date: formData.invoice_date ? new Date(formData.invoice_date).toISOString() : new Date().toISOString(),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      milestone_name: formData.milestone_name || null,
      milestone_percentage: formData.milestone_percentage ? parseFloat(formData.milestone_percentage) : null,
      notes: formData.notes || null,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "issued":
        return "default"
      case "paid":
        return "success"
      case "overdue":
        return "destructive"
      case "cancelled":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "issued":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">Manage invoices and demand notes</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((invoice: any) => (
                <div key={invoice.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                  {getStatusIcon(invoice.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <Badge variant={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{invoice.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {invoice.project_name} {invoice.unit_number && `- ${invoice.unit_number}`}
                      {invoice.milestone_name && ` - ${invoice.milestone_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                    {invoice.balance_amount > 0 && (
                      <p className="text-sm text-red-500">Balance: {formatCurrency(invoice.balance_amount)}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              ))}
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-gray-500">No invoices found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Create Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="booking_id">Booking *</Label>
                  <select
                    id="booking_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.booking_id}
                    onChange={(e) => {
                      const bookingId = e.target.value
                      setFormData({ ...formData, booking_id: bookingId })
                      const booking = bookingsData?.data?.find((b: any) => b.id === parseInt(bookingId))
                      setSelectedBooking(booking)
                    }}
                    required
                  >
                    <option value="">Select a booking</option>
                    {bookingsData?.data?.map((booking: any) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.booking_number} - {booking.customer_name} ({booking.project_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="milestone_name">Milestone Name</Label>
                    <Input
                      id="milestone_name"
                      placeholder="e.g., Booking Amount"
                      value={formData.milestone_name}
                      onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="milestone_percentage">Milestone %</Label>
                    <Input
                      id="milestone_percentage"
                      type="number"
                      placeholder="e.g., 10"
                      value={formData.milestone_percentage}
                      onChange={(e) => setFormData({ ...formData, milestone_percentage: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
