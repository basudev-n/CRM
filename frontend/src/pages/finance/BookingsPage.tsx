import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Plus, CheckCircle, Clock } from "lucide-react"

export default function BookingsPage() {
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    lead_id: "",
    booking_amount: "",
    project_name: "",
    tower: "",
    unit_number: "",
    unit_type: "",
    area_sqft: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    agreement_value: "",
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get(`/finance/bookings?page=${page}&per_page=20`).then((res) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/finance/bookings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      setShowCreateModal(false)
      toast({ title: "Booking created successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create booking" })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      lead_id: parseInt(formData.lead_id),
      booking_amount: parseFloat(formData.booking_amount),
      area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : undefined,
      agreement_value: parseFloat(formData.agreement_value),
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "booked":
        return "default"
      case "confirmed":
        return "secondary"
      case "agreement":
        return "warning"
      case "registration":
        return "success"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
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
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage property bookings</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Bookings List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((booking: any) => (
                <div key={booking.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{booking.customer_name}</p>
                      <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {booking.project_name} {booking.tower && `- Tower ${booking.tower}`} {booking.unit_number && `- Unit ${booking.unit_number}`}
                    </p>
                    <p className="text-sm text-gray-500">{booking.unit_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(booking.agreement_value)}</p>
                    <p className="text-sm text-gray-500">Agreement Value</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-gray-500">No bookings found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_id">Lead ID *</Label>
                  <Input
                    id="lead_id"
                    type="number"
                    value={formData.lead_id}
                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project_name">Project Name *</Label>
                    <Input
                      id="project_name"
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_type">Unit Type *</Label>
                    <Input
                      id="unit_type"
                      value={formData.unit_type}
                      onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tower">Tower</Label>
                    <Input
                      id="tower"
                      value={formData.tower}
                      onChange={(e) => setFormData({ ...formData, tower: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_number">Unit Number</Label>
                    <Input
                      id="unit_number"
                      value={formData.unit_number}
                      onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking_amount">Booking Amount *</Label>
                    <Input
                      id="booking_amount"
                      type="number"
                      value={formData.booking_amount}
                      onChange={(e) => setFormData({ ...formData, booking_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement_value">Agreement Value *</Label>
                    <Input
                      id="agreement_value"
                      type="number"
                      value={formData.agreement_value}
                      onChange={(e) => setFormData({ ...formData, agreement_value: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Booking"}
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
