import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, Plus } from "lucide-react"

export default function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    booking_id: "",
    payment_date: "",
    amount: "",
    payment_method: "neft",
    reference_number: "",
    bank_name: "",
    cheque_number: "",
    notes: "",
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get(`/finance/payments?page=${page}&per_page=20`).then((res) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/finance/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] })
      setShowCreateModal(false)
      toast({ title: "Payment recorded successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to record payment" })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      booking_id: parseInt(formData.booking_id),
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date || new Date().toISOString(),
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">Record and track payments</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Payments List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((payment: any) => (
                <div key={payment.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{payment.payment_number}</p>
                    <p className="text-sm text-gray-500">{payment.receipt_number && `Receipt: ${payment.receipt_number}`}</p>
                    <p className="text-xs text-gray-400">
                      {payment.payment_method.toUpperCase()}
                      {payment.reference_number && ` - ${payment.reference_number}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-gray-500">No payments found</div>
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
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="booking_id">Booking ID *</Label>
                  <Input
                    id="booking_id"
                    type="number"
                    value={formData.booking_id}
                    onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Payment Date</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Label htmlFor="reference_number">Reference/Transaction Number</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                {formData.payment_method === "cheque" && (
                  <div className="space-y-2">
                    <Label htmlFor="cheque_number">Cheque Number</Label>
                    <Input
                      id="cheque_number"
                      value={formData.cheque_number}
                      onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                    />
                  </div>
                )}
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
                    {createMutation.isPending ? "Recording..." : "Record Payment"}
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
