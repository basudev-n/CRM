import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { financeApi, leadsApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Plus, CheckCircle, Clock, Sparkles, Search, ChevronDown, Link2 } from "lucide-react"

export default function BookingsPage() {
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [convertBooking, setConvertBooking] = useState<any | null>(null)
  const initialFormData = {
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
  }
  const [formData, setFormData] = useState({ ...initialFormData })
  const initialConvertForm = {
    base_price: "",
    floor_premium: "",
    plc: "",
    parking: "",
    club_membership: "",
    other_charges: "",
    gst_rate: "5",
    stamp_duty: "",
    registration: "",
    valid_until: "",
    terms_conditions: "",
    notes: "",
  }
  const [convertForm, setConvertForm] = useState(initialConvertForm)

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", page],
    queryFn: () => financeApi.listBookings({ page, per_page: 20 }).then((res) => res.data),
  })

  const { data: leadsData, isLoading: isLeadsLoading } = useQuery({
    queryKey: ["booking-leads"],
    queryFn: () => leadsApi.list({ per_page: 100 }).then((res) => res.data),
  })

  const bookings = data?.data || []

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return bookings.filter((booking: any) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false
      }
      if (!term) return true
      return (
        booking.customer_name?.toLowerCase().includes(term) ||
        booking.project_name?.toLowerCase().includes(term) ||
        booking.booking_number?.toLowerCase().includes(term || "")
      )
    })
  }, [bookings, searchTerm, statusFilter])

  const summary = useMemo(() => {
    const totalValue = bookings.reduce((acc: number, b: any) => acc + (b.agreement_value || 0), 0)
    const bookedCount = bookings.filter((b: any) => b.status === "booked").length
    const confirmedCount = bookings.filter((b: any) => b.status === "confirmed").length
    const registrationCount = bookings.filter((b: any) => b.status === "registration").length
    return { totalValue, bookedCount, confirmedCount, registrationCount }
  }, [bookings])

  const parseNumber = (value?: string) => Number(value || 0)
  const gstRateValue = parseNumber(convertForm.gst_rate)
  const convertTotals = useMemo(() => {
    const base = parseNumber(convertForm.base_price || String(convertBooking?.agreement_value || 0))
    const floorPremium = parseNumber(convertForm.floor_premium)
    const plc = parseNumber(convertForm.plc)
    const parking = parseNumber(convertForm.parking)
    const club = parseNumber(convertForm.club_membership)
    const other = parseNumber(convertForm.other_charges)
    const stampDuty = parseNumber(convertForm.stamp_duty)
    const registration = parseNumber(convertForm.registration)
    const subtotal = base + floorPremium + plc + parking + club + other
    const gstAmount = subtotal * (gstRateValue / 100)
    const total = subtotal + gstAmount + stampDuty + registration
    return { base, floorPremium, subtotal, gstAmount, total }
  }, [convertForm, convertBooking, gstRateValue])

  const convertMutation = useMutation({
    mutationFn: (payload: any) => financeApi.createQuotation(payload),
    onSuccess: () => {
      toast({ title: "Booking converted", description: "A quotation has been created." })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["quotations"] })
      setConvertBooking(null)
      setConvertForm(initialConvertForm)
    },
    onError: () => toast({ variant: "destructive", title: "Failed to convert booking" }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => financeApi.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      setFormData(initialFormData)
      setShowCreateModal(false)
      toast({ title: "Booking created successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create booking" })
    },
  })

  const handleConvert = (e: FormEvent) => {
    e.preventDefault()
    if (!convertBooking) return
    convertMutation.mutate({
      lead_id: convertBooking.lead_id,
      customer_name: convertBooking.customer_name,
      customer_email: convertBooking.customer_email || null,
      customer_phone: convertBooking.customer_phone || null,
      project_name: convertBooking.project_name,
      tower: convertBooking.tower || null,
      unit_number: convertBooking.unit_number || null,
      unit_type: convertBooking.unit_type || convertBooking.unit_type_preference || "",
      area_sqft: convertBooking.area_sqft || null,
      base_price: convertTotals.base,
      floor_premium: parseNumber(convertForm.floor_premium) || null,
      plc: parseNumber(convertForm.plc) || null,
      parking: parseNumber(convertForm.parking) || null,
      club_membership: parseNumber(convertForm.club_membership) || null,
      other_charges: parseNumber(convertForm.other_charges) || null,
      gst_amount: convertTotals.gstAmount,
      stamp_duty: parseNumber(convertForm.stamp_duty) || null,
      registration: parseNumber(convertForm.registration) || null,
      total: convertTotals.total,
      valid_until: convertForm.valid_until ? new Date(convertForm.valid_until).toISOString() : null,
      terms_conditions: convertForm.terms_conditions || null,
      notes: convertForm.notes || null,
    })
  }

  const openConvertModal = (booking: any) => {
    setConvertBooking(booking)
    setConvertForm({
      ...initialConvertForm,
      base_price: String(booking.agreement_value || ""),
      gst_rate: "5",
    })
  }

  const closeConvertModal = () => {
    setConvertBooking(null)
    setConvertForm(initialConvertForm)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.lead_id) {
      toast({ variant: "destructive", title: "Please select a lead" })
      return
    }
    createMutation.mutate({
      ...formData,
      lead_id: parseInt(formData.lead_id),
      booking_amount: parseFloat(formData.booking_amount),
      area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : undefined,
      agreement_value: parseFloat(formData.agreement_value),
    })
  }

  const handleLeadChange = (leadId: string) => {
    const selectedLead = leadsData?.data?.find((lead: any) => lead.id === parseInt(leadId, 10))

    if (!selectedLead) {
      setFormData((prev) => ({
        ...prev,
        lead_id: leadId,
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        project_name: "",
        unit_type: "",
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      lead_id: leadId,
      customer_name: selectedLead.name || "",
      customer_email: selectedLead.email || "",
      customer_phone: selectedLead.phone || "",
      project_name: selectedLead.project_interest || "",
      unit_type: selectedLead.unit_type_preference || "",
      agreement_value:
        prev.agreement_value ||
        (selectedLead.budget_max ? String(selectedLead.budget_max) : selectedLead.budget_min ? String(selectedLead.budget_min) : ""),
    }))
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
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">Booking <span className="font-semibold">Control</span></h1>
          <p className="text-zinc-500 mt-2">Keep bookings synced and convert the hottest leads into quotations without leaving the board.</p>
        </div>
        <Button
          onClick={() => {
            setFormData(initialFormData)
            setShowCreateModal(true)
          }}
          className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-6"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Total Pipeline</p>
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center"><FileText className="h-5 w-5 text-zinc-600" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{formatCurrency(summary.totalValue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Booked</p>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-500" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{summary.bookedCount}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Confirmed</p>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{summary.confirmedCount}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Registration</p>
            <div className="h-11 w-11 rounded-2xl bg-sky-50 flex items-center justify-center"><Sparkles className="h-5 w-5 text-sky-500" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{summary.registrationCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Active Bookings ({bookings.length})</h3>
        </div>
        <div className="p-0">
          <div className="flex flex-wrap gap-3 px-5 py-3">
            <div className="relative flex-1 min-w-[220px]">
              <Input
                placeholder="Search customer, project, or booking"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 shadow-inner"
              />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
            <div className="relative">
              <select
                className="h-10 appearance-none rounded-full border border-zinc-300 bg-white px-3 pr-10 text-xs font-semibold text-zinc-700 outline-none transition hover:border-zinc-900 focus:border-zinc-900"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="agreement">Agreement</option>
                <option value="registration">Registration</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
                <ChevronDown className="h-4 w-4" />
              </span>
            </div>
          </div>
          <div className="divide-y">
            {(isLoading ? Array.from({ length: 3 }) : filteredBookings).map((booking: any, index: number) => {
              if (isLoading) {
                return (
                  <div key={`placeholder-${index}`} className="p-4 flex items-start gap-4 animate-pulse">
                    <div className="h-10 w-10 rounded-lg bg-zinc-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-zinc-200" />
                      <div className="h-3 w-1/2 rounded bg-zinc-200" />
                    </div>
                  </div>
                )
              }
              return (
                <div
                  key={booking.id}
                  className="group flex flex-col gap-4 px-5 py-4 transition hover:bg-zinc-50 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm">
                      <FileText className="h-5 w-5 text-zinc-700" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-zinc-900">{booking.customer_name}</p>
                        <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                      </div>
                      <p className="text-sm text-zinc-500">
                        {booking.project_name}
                        {booking.unit_number ? ` · ${booking.unit_number}` : ""}
                      </p>
                      <p className="text-sm text-zinc-500">{booking.unit_type}</p>
                      <p className="text-xs text-zinc-400">Booked on {new Date(booking.booking_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 text-sm md:items-end">
                    <p className="text-lg font-semibold text-zinc-900">{formatCurrency(booking.agreement_value)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-300 bg-white text-zinc-700 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                        onClick={() => openConvertModal(booking)}
                      >
                        <Sparkles className="mr-1 h-4 w-4" />
                        Convert to Quote
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/finance/bookings?booking=${booking.id}`)
                          toast({ title: "Booking link copied" })
                        }}
                      >
                        <Link2 className="mr-1 h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            {!isLoading && filteredBookings.length === 0 && (
              <div className="px-6 py-12 text-center text-zinc-500">No bookings match the current filter.</div>
            )}
          </div>
        </div>
      </div>

      {convertBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white text-zinc-900">
            <CardHeader className="border-b border-zinc-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-zinc-500" />
                  <CardTitle>Convert Booking</CardTitle>
                </div>
                <button className="text-sm text-zinc-500 underline-offset-2 hover:underline" onClick={closeConvertModal}>
                  Cancel
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Booking snapshot</p>
                <p className="text-lg font-semibold text-zinc-900 mt-2">{convertBooking.customer_name}</p>
                <p className="text-sm text-zinc-500">{convertBooking.project_name}</p>
                <p className="text-sm text-zinc-500">
                  {convertBooking.tower ? `Tower ${convertBooking.tower}` : ""} {convertBooking.unit_number ? `· Unit ${convertBooking.unit_number}` : ""}
                </p>
              </div>

              <form onSubmit={handleConvert} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Base Price *</Label>
                    <Input
                      value={convertForm.base_price}
                      onChange={(e) => setConvertForm({ ...convertForm, base_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Floor Premium</Label>
                    <Input value={convertForm.floor_premium} onChange={(e) => setConvertForm({ ...convertForm, floor_premium: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>PLC</Label>
                    <Input value={convertForm.plc} onChange={(e) => setConvertForm({ ...convertForm, plc: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Parking</Label>
                    <Input value={convertForm.parking} onChange={(e) => setConvertForm({ ...convertForm, parking: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Club</Label>
                    <Input value={convertForm.club_membership} onChange={(e) => setConvertForm({ ...convertForm, club_membership: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Charges</Label>
                    <Input value={convertForm.other_charges} onChange={(e) => setConvertForm({ ...convertForm, other_charges: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>GST Rate</Label>
                    <select
                      className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
                      value={convertForm.gst_rate}
                      onChange={(e) => setConvertForm({ ...convertForm, gst_rate: e.target.value })}
                    >
                      <option value="5">5%</option>
                      <option value="9">9%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stamp Duty</Label>
                    <Input value={convertForm.stamp_duty} onChange={(e) => setConvertForm({ ...convertForm, stamp_duty: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Registration</Label>
                    <Input value={convertForm.registration} onChange={(e) => setConvertForm({ ...convertForm, registration: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valid Until</Label>
                    <Input type="date" value={convertForm.valid_until} onChange={(e) => setConvertForm({ ...convertForm, valid_until: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Input value={convertForm.terms_conditions} onChange={(e) => setConvertForm({ ...convertForm, terms_conditions: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={convertForm.notes} onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })} />
                </div>
                <div className="space-y-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  <p>Subtotal: {formatCurrency(convertTotals.subtotal)}</p>
                  <p>GST: {formatCurrency(convertTotals.gstAmount)}</p>
                  <p className="font-semibold text-zinc-900">Estimated Total: {formatCurrency(convertTotals.total)}</p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={closeConvertModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={convertMutation.isPending}>
                    {convertMutation.isPending ? "Converting..." : "Convert to Quotation"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Create Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_id">Lead *</Label>
                  <Select value={formData.lead_id} onValueChange={handleLeadChange}>
                    <SelectTrigger
                      id="lead_id"
                      className="h-11 border-zinc-300 bg-zinc-50/60 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50 focus:border-black focus:ring-black/20"
                    >
                      <SelectValue placeholder={isLeadsLoading ? "Loading leads..." : "Select a lead"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(leadsData?.data || []).length > 0 ? (
                        leadsData?.data?.map((lead: any) => (
                          <SelectItem key={lead.id} value={String(lead.id)}>
                            {lead.name} ({lead.phone || lead.email || `ID: ${lead.id}`})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-leads" disabled>
                          No leads available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">Selecting a lead auto-fills customer and project details.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking_amount">Booking Amount</Label>
                  <Input
                    id="booking_amount"
                    value={formData.booking_amount}
                    onChange={(e) => setFormData({ ...formData, booking_amount: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project_name">Project</Label>
                    <Input id="project_name" value={formData.project_name} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_type">Unit Type</Label>
                    <Input id="unit_type" value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tower">Tower</Label>
                    <Input id="tower" value={formData.tower} onChange={(e) => setFormData({ ...formData, tower: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_number">Unit Number</Label>
                    <Input id="unit_number" value={formData.unit_number} onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agreement_value">Agreement Value</Label>
                  <Input
                    id="agreement_value"
                    value={formData.agreement_value}
                    onChange={(e) => setFormData({ ...formData, agreement_value: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Booking"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
