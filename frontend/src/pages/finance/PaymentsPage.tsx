import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { financeApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, Plus, CalendarDays } from "lucide-react"

export default function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false)
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string>("")
  const [paymentData, setPaymentData] = useState({
    booking_id: "",
    invoice_id: "",
    payment_date: "",
    amount: "",
    payment_method: "neft",
    reference_number: "",
    bank_name: "",
    cheque_number: "",
    notes: "",
  })
  const [scheduleData, setScheduleData] = useState({
    booking_id: "",
    milestone_name: "",
    milestone_percentage: "",
    amount: "",
    due_date: "",
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["payments", page],
    queryFn: () => financeApi.listPayments({ page, per_page: 20 }).then((res) => res.data),
  })

  const { data: bookingsData } = useQuery({
    queryKey: ["payments-bookings"],
    queryFn: () => financeApi.listBookings({ per_page: 200 }).then((res) => res.data),
  })

  const { data: invoicesData } = useQuery({
    queryKey: ["payments-invoices"],
    queryFn: () => financeApi.listInvoices({ per_page: 200 }).then((res) => res.data),
  })

  const { data: scheduleListData } = useQuery({
    queryKey: ["payment-schedule", selectedBookingId],
    queryFn: () =>
      financeApi
        .listPaymentSchedule({ booking_id: selectedBookingId ? parseInt(selectedBookingId, 10) : undefined, per_page: 100 })
        .then((res) => res.data),
  })

  const filteredInvoices = useMemo(() => {
    if (!paymentData.booking_id) return invoicesData?.data || []
    return (invoicesData?.data || []).filter((invoice: any) => invoice.booking_id === parseInt(paymentData.booking_id, 10))
  }, [invoicesData, paymentData.booking_id])

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => financeApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      setShowCreatePaymentModal(false)
      toast({ title: "Payment recorded successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to record payment", description: error?.response?.data?.detail || "Please try again" })
    },
  })

  const createScheduleMutation = useMutation({
    mutationFn: (data: any) => financeApi.createPaymentSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-schedule"] })
      setShowCreateScheduleModal(false)
      toast({ title: "Payment milestone added" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create milestone", description: error?.response?.data?.detail || "Please try again" })
    },
  })

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault()
    createPaymentMutation.mutate({
      ...paymentData,
      booking_id: parseInt(paymentData.booking_id, 10),
      invoice_id: paymentData.invoice_id ? parseInt(paymentData.invoice_id, 10) : null,
      amount: parseFloat(paymentData.amount),
      payment_date: paymentData.payment_date ? new Date(paymentData.payment_date).toISOString() : new Date().toISOString(),
    })
  }

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    createScheduleMutation.mutate({
      booking_id: parseInt(scheduleData.booking_id, 10),
      milestone_name: scheduleData.milestone_name,
      milestone_percentage: parseFloat(scheduleData.milestone_percentage || "0"),
      amount: parseFloat(scheduleData.amount || "0"),
      due_date: scheduleData.due_date ? new Date(scheduleData.due_date).toISOString() : null,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">Payment <span className="font-semibold">Tracker</span></h1>
          <p className="text-zinc-500 mt-2">Record payments and manage payment schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full border-zinc-300 hover:bg-zinc-100" onClick={() => setShowCreateScheduleModal(true)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
          <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-6" onClick={() => setShowCreatePaymentModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Payments</h3>
        </div>
        <div className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {paymentsData?.data?.map((payment: any) => (
                <div key={payment.id} className="p-4 flex items-start gap-4 hover:bg-zinc-50">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{payment.payment_number}</p>
                    <p className="text-sm text-zinc-500">{payment.receipt_number && `Receipt: ${payment.receipt_number}`}</p>
                    <p className="text-xs text-zinc-400">
                      {payment.payment_method.toUpperCase()}
                      {payment.reference_number && ` - ${payment.reference_number}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-zinc-500">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {paymentsData?.data?.length === 0 && (
                <div className="text-center py-10 text-zinc-500">No payments found</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Payment Schedule</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="max-w-md">
            <Label>Select Booking</Label>
            <select
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
            >
              <option value="">All bookings</option>
              {bookingsData?.data?.map((booking: any) => (
                <option key={booking.id} value={booking.id}>
                  {booking.booking_number} - {booking.customer_name}
                </option>
              ))}
            </select>
          </div>
          <div className="divide-y border rounded-2xl">
            {scheduleListData?.data?.map((item: any) => (
              <div key={item.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.milestone_name}</p>
                  <p className="text-sm text-zinc-500">Booking #{item.booking_id} | {item.milestone_percentage}%</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-zinc-500">Due {item.due_date ? new Date(item.due_date).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
            ))}
            {scheduleListData?.data?.length === 0 && (
              <div className="p-6 text-center text-zinc-500">No milestones found</div>
            )}
          </div>
        </div>
      </div>

      {showCreatePaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label>Booking *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentData.booking_id}
                    onChange={(e) => setPaymentData({ ...paymentData, booking_id: e.target.value, invoice_id: "" })}
                    required
                  >
                    <option value="">Select booking</option>
                    {bookingsData?.data?.map((booking: any) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.booking_number} - {booking.customer_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice (Optional)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentData.invoice_id}
                    onChange={(e) => setPaymentData({ ...paymentData, invoice_id: e.target.value })}
                  >
                    <option value="">No linked invoice</option>
                    {filteredInvoices.map((invoice: any) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number} - Bal {formatCurrency(invoice.balance_amount || 0)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <DatePicker value={paymentData.payment_date} onChange={(value) => setPaymentData({ ...paymentData, payment_date: value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select value={paymentData.payment_method} onValueChange={(value) => setPaymentData({ ...paymentData, payment_method: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="neft">NEFT</SelectItem>
                      <SelectItem value="rtgs">RTGS</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reference/Transaction Number</Label>
                  <Input value={paymentData.reference_number} onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={paymentData.bank_name} onChange={(e) => setPaymentData({ ...paymentData, bank_name: e.target.value })} />
                </div>
                {paymentData.payment_method === "cheque" && (
                  <div className="space-y-2">
                    <Label>Cheque Number</Label>
                    <Input value={paymentData.cheque_number} onChange={(e) => setPaymentData({ ...paymentData, cheque_number: e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreatePaymentModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPaymentMutation.isPending}>
                    {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Add Payment Milestone</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div className="space-y-2">
                  <Label>Booking *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={scheduleData.booking_id}
                    onChange={(e) => setScheduleData({ ...scheduleData, booking_id: e.target.value })}
                    required
                  >
                    <option value="">Select booking</option>
                    {bookingsData?.data?.map((booking: any) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.booking_number} - {booking.customer_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Milestone Name *</Label>
                  <Input value={scheduleData.milestone_name} onChange={(e) => setScheduleData({ ...scheduleData, milestone_name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Milestone % *</Label>
                    <Input type="number" value={scheduleData.milestone_percentage} onChange={(e) => setScheduleData({ ...scheduleData, milestone_percentage: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" value={scheduleData.amount} onChange={(e) => setScheduleData({ ...scheduleData, amount: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <DatePicker value={scheduleData.due_date} onChange={(value) => setScheduleData({ ...scheduleData, due_date: value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateScheduleModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={createScheduleMutation.isPending}>
                    {createScheduleMutation.isPending ? "Saving..." : "Add Milestone"}
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
