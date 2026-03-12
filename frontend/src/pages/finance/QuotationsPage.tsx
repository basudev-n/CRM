import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { financeApi, inventoryApi, leadsApi, projectsApi } from "@/services/api"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/use-toast"
import {
  FileText,
  Plus,
  Download,
  Sparkles,
  IndianRupee,
  Clock3,
  Send,
  CheckCircle2,
  XCircle,
  Link2,
  Copy,
  Search,
  ChevronDown,
  Receipt,
  CalendarDays,
} from "lucide-react"

export default function QuotationsPage() {
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [formData, setFormData] = useState({
    lead_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    project_name: "",
    tower: "",
    unit_number: "",
    unit_type: "",
    base_price: "",
    floor_premium: "",
    plc: "",
    parking: "",
    club_membership: "",
    other_charges: "",
    gst_rate: "5",
    stamp_duty: "",
    registration: "",
    total: "0",
    valid_until: "",
    terms_conditions: "",
    notes: "",
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const parsedValues = useMemo(() => {
    const base = parseFloat(formData.base_price || "0")
    const floorPremium = parseFloat(formData.floor_premium || "0")
    const plc = parseFloat(formData.plc || "0")
    const parking = parseFloat(formData.parking || "0")
    const club = parseFloat(formData.club_membership || "0")
    const other = parseFloat(formData.other_charges || "0")
    const stampDuty = parseFloat(formData.stamp_duty || "0")
    const registration = parseFloat(formData.registration || "0")
    const gstRate = parseFloat(formData.gst_rate || "5")

    const subtotal = base + floorPremium + plc + parking + club + other
    const gstAmount = subtotal * (gstRate / 100)
    const total = subtotal + gstAmount + stampDuty + registration

    return { gstAmount, total, subtotal }
  }, [
    formData.base_price,
    formData.floor_premium,
    formData.plc,
    formData.parking,
    formData.club_membership,
    formData.other_charges,
    formData.stamp_duty,
    formData.registration,
    formData.gst_rate,
  ])

  const { data } = useQuery({
    queryKey: ["quotations", page],
    queryFn: () => financeApi.listQuotations({ page, per_page: 20 }).then((res) => res.data),
  })

  const { data: leadsData } = useQuery({
    queryKey: ["quotation-leads"],
    queryFn: () => leadsApi.list({ per_page: 100 }).then((res) => res.data),
  })

  const shareMutation = useMutation({
    mutationFn: (quotationId: number) => financeApi.createQuotationShare(quotationId),
    onSuccess: () => {
      toast({ title: "Share link ready", description: "Stored for quick copy." })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Could not generate share link" })
    },
  })
  const [shareLinks, setShareLinks] = useState<Record<number, string>>({})
  const [sharingId, setSharingId] = useState<number | null>(null)
  const [convertInvoiceQuote, setConvertInvoiceQuote] = useState<any | null>(null)
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    milestone_name: "",
    milestone_percentage: "",
    notes: "",
  })
  const copyShareLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      toast({ title: "Link copied", description: "Share it with the client." })
    } catch {
      toast({ variant: "destructive", title: "Unable to copy link" })
    }
  }

  const convertInvoiceMutation = useMutation({
    mutationFn: (payload: any) =>
      convertInvoiceQuote ? financeApi.convertQuotationToInvoice(convertInvoiceQuote.id, payload) : Promise.reject(),
    onSuccess: () => {
      toast({ title: "Invoice created", description: "A new invoice is in the finance ledger." })
      setConvertInvoiceQuote(null)
      setInvoiceForm({
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        milestone_name: "",
        milestone_percentage: "",
        notes: "",
      })
    },
    onError: () => toast({ variant: "destructive", title: "Unable to create invoice" }),
  })

  const openInvoiceModal = (quotation: any) => {
    setConvertInvoiceQuote(quotation)
    setInvoiceForm((prev) => ({
      ...prev,
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: "",
      milestone_name: "",
      milestone_percentage: "",
      notes: "",
    }))
  }

  const closeInvoiceModal = () => {
    setConvertInvoiceQuote(null)
  }

  const handleInvoiceSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!convertInvoiceQuote) return
    convertInvoiceMutation.mutate({
      invoice_date: new Date(invoiceForm.invoice_date).toISOString(),
      due_date: invoiceForm.due_date ? new Date(invoiceForm.due_date).toISOString() : null,
      milestone_name: invoiceForm.milestone_name || null,
      milestone_percentage: invoiceForm.milestone_percentage ? parseFloat(invoiceForm.milestone_percentage) : null,
      notes: invoiceForm.notes || null,
    })
  }

  const { data: projectsData } = useQuery({
    queryKey: ["quotation-projects"],
    queryFn: () => projectsApi.list({ per_page: 500 }).then((res) => res.data),
  })

  const { data: projectTowersData } = useQuery({
    queryKey: ["quotation-project-towers", selectedProjectId],
    queryFn: () => inventoryApi.listTowers(selectedProjectId as number).then((res) => res.data),
    enabled: !!selectedProjectId,
  })

  const { data: inventoryUnitsData } = useQuery({
    queryKey: ["quotation-project-units", selectedProjectId],
    queryFn: () =>
      inventoryApi
        .listUnits({ project_id: selectedProjectId as number, status: "available", per_page: 1000 })
        .then((res) => res.data),
    enabled: !!selectedProjectId,
  })

  const navigate = useNavigate()

  const createMutation = useMutation({
    mutationFn: (payload: any) => financeApi.createQuotation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] })
      setShowCreateModal(false)
      toast({ title: "Quotation created" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create quotation", description: error?.response?.data?.detail || "Please try again" })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => financeApi.updateQuotation(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] })
    },
  })

  const downloadPdf = async (quotationId: number, quotationNumber: string) => {
    try {
      const res = await financeApi.downloadQuotationPdf(quotationId)
      const blob = new Blob([res.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `quotation_${quotationNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast({ variant: "destructive", title: "Failed to download PDF" })
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      lead_id: parseInt(formData.lead_id),
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      tower: formData.tower || null,
      unit_number: formData.unit_number || null,
      floor_premium: formData.floor_premium ? parseFloat(formData.floor_premium) : null,
      plc: formData.plc ? parseFloat(formData.plc) : null,
      parking: formData.parking ? parseFloat(formData.parking) : null,
      club_membership: formData.club_membership ? parseFloat(formData.club_membership) : null,
      other_charges: formData.other_charges ? parseFloat(formData.other_charges) : null,
      base_price: parseFloat(formData.base_price || "0"),
      gst_amount: parsedValues.gstAmount,
      stamp_duty: formData.stamp_duty ? parseFloat(formData.stamp_duty) : null,
      registration: formData.registration ? parseFloat(formData.registration) : null,
      total: parsedValues.total,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      terms_conditions: formData.terms_conditions || null,
      notes: formData.notes || null,
    })
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0)

  const formatDate = (value?: string) => {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  const handleLeadSelect = (leadId: string) => {
    const lead = leadsData?.data?.find((l: any) => l.id === parseInt(leadId, 10))
    const normalize = (value?: string) => (value || "").trim().toLowerCase()
    const leadProject = lead?.project_interest || ""
    const projectMatch = (projectsData?.data || []).find((project: any) => {
      const projectName = normalize(project?.name)
      const leadName = normalize(leadProject)
      return !!leadName && (projectName === leadName || projectName.includes(leadName) || leadName.includes(projectName))
    })

    setSelectedProjectId(projectMatch?.id || null)

    setFormData((prev) => ({
      ...prev,
      lead_id: leadId,
      customer_name: lead?.name || "",
      customer_email: lead?.email || "",
      customer_phone: lead?.phone || "",
      project_name: projectMatch?.name || leadProject || "",
      tower: "",
      unit_number: "",
      unit_type: lead?.unit_type_preference || prev.unit_type,
    }))
  }

  useEffect(() => {
    if (!selectedProjectId) return
    const units = inventoryUnitsData?.data || []
    if (units.length === 0) return

    const selectedUnit =
      units.find((unit: any) => unit.unit_number === formData.unit_number) ||
      units.find((unit: any) => unit.status === "available") ||
      units[0]

    if (!selectedUnit) return

    const tower = (projectTowersData?.data || []).find((t: any) => t.id === selectedUnit.tower_id)
    const derivedBasePrice = selectedUnit.total_price || selectedUnit.base_price || 0

    setFormData((prev) => {
      const next = {
        ...prev,
        tower: tower?.name ? String(tower.name) : prev.tower,
        unit_number: selectedUnit.unit_number || prev.unit_number,
        unit_type: selectedUnit.unit_type || prev.unit_type,
        base_price: derivedBasePrice ? String(derivedBasePrice) : prev.base_price,
      }
      if (
        next.tower === prev.tower &&
        next.unit_number === prev.unit_number &&
        next.unit_type === prev.unit_type &&
        next.base_price === prev.base_price
      ) {
        return prev
      }
      return next
    })
  }, [selectedProjectId, inventoryUnitsData, projectTowersData, formData.unit_number])

  const quotations = data?.data || []

  const summary = useMemo(() => {
    const totalCount = quotations.length
    const draftCount = quotations.filter((q: any) => q.status === "draft").length
    const sentCount = quotations.filter((q: any) => q.status === "sent").length
    const acceptedCount = quotations.filter((q: any) => q.status === "accepted").length
    const totalValue = quotations.reduce((acc: number, q: any) => acc + (q.total || 0), 0)
    return { totalCount, draftCount, sentCount, acceptedCount, totalValue }
  }, [quotations])

  const filteredQuotations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return quotations.filter((quotation: any) => {
      if (statusFilter !== "all" && quotation.status !== statusFilter) {
        return false
      }
      if (!term) return true
      return (
        quotation.customer_name?.toLowerCase().includes(term) ||
        quotation.project_name?.toLowerCase().includes(term) ||
        quotation.quotation_number?.toLowerCase().includes(term)
      )
    })
  }, [quotations, searchTerm, statusFilter])

  const statusClasses = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "sent":
        return "bg-sky-50 text-sky-700 border-sky-200"
      case "rejected":
      case "expired":
        return "bg-rose-50 text-rose-700 border-rose-200"
      default:
        return "bg-amber-50 text-amber-700 border-amber-200"
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">Quotation <span className="font-semibold">Studio</span></h1>
          <p className="text-zinc-500 mt-2">Create polished client quotations, track lifecycle, and export premium PDFs.</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-6"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Quotation
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Total Value</p>
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-zinc-600" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{formatCurrency(summary.totalValue)}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Draft</p>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center"><Clock3 className="h-5 w-5 text-amber-500" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{summary.draftCount}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Sent</p>
            <div className="h-11 w-11 rounded-2xl bg-sky-50 flex items-center justify-center"><Send className="h-5 w-5 text-sky-500" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{summary.sentCount}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Accepted</p>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">{summary.acceptedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">All Quotations ({summary.totalCount})</h3>
        </div>
        <div className="p-0">
          <div className="flex flex-wrap gap-3 px-5 py-3">
            <div className="relative flex-1 min-w-[220px]">
              <Input
                placeholder="Search customer, project, quote"
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
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
                <ChevronDown className="h-4 w-4" />
              </span>
            </div>
          </div>

          {filteredQuotations.length === 0 && (
            <div className="px-6 py-12 text-center text-zinc-500">No quotations found</div>
          )}

          <div className="divide-y">
            {filteredQuotations.map((q: any) => (
              <div
              key={q.id}
              className="group flex flex-col gap-4 px-5 py-4 transition hover:bg-zinc-50 md:flex-row md:items-center md:justify-between"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/finance/quotations/preview/${q.id}`)}
            >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm">
                    <FileText className="h-5 w-5 text-zinc-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-zinc-900">{q.quotation_number}</p>
                      <Badge className={`border ${statusClasses(q.status)}`}>{q.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">{q.customer_name}</p>
                    <p className="text-sm text-zinc-500">
                      {q.project_name}
                      {q.unit_number ? ` - ${q.unit_number}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">Valid till: {formatDate(q.valid_until)}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <p className="text-lg font-semibold text-zinc-900">{formatCurrency(q.total)}</p>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button
                        size="sm"
                      variant="outline"
                      className="border-zinc-300 bg-white text-zinc-700 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadPdf(q.id, q.quotation_number)
                      }}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
                        onClick={(e) => {
                          e.stopPropagation()
                          openInvoiceModal(q)
                        }}
                      >
                        <Receipt className="mr-1 h-4 w-4" />
                        Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                      className="border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSharingId(q.id)
                        shareMutation.mutate(q.id, {
                          onSuccess: (res) => {
                            setShareLinks((prev) => ({ ...prev, [q.id]: res.data.share_url }))
                          },
                          onSettled: () => setSharingId(null),
                        })
                      }}
                      disabled={sharingId === q.id}
                    >
                      <Link2 className="mr-1 h-4 w-4" />
                      {shareLinks[q.id] ? "Shared" : "Share"}
                    </Button>
                    <select
                      className="h-9 rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 outline-none transition focus:border-zinc-900"
                      value={q.status}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateStatusMutation.mutate({ id: q.id, status: e.target.value })
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  {shareLinks[q.id] && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-sky-600">
                      <Copy className="h-3 w-3" />
                      <button
                        type="button"
                        className="underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyShareLink(shareLinks[q.id])
                        }}
                      >
                        Copy share link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {convertInvoiceQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white text-zinc-900">
            <CardHeader className="border-b border-zinc-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-zinc-500" />
                  <CardTitle>Generate Invoice</CardTitle>
                </div>
                <button className="text-sm text-zinc-500 underline-offset-2 hover:underline" onClick={closeInvoiceModal}>
                  Cancel
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Quotation snapshot</p>
                <p className="text-lg font-semibold text-zinc-900 mt-2">{convertInvoiceQuote.customer_name}</p>
                <p className="text-sm text-zinc-500">{convertInvoiceQuote.project_name}</p>
                <p className="text-sm text-zinc-500">
                  {convertInvoiceQuote.tower ? `Tower ${convertInvoiceQuote.tower}` : ""} {convertInvoiceQuote.unit_number ? `· Unit ${convertInvoiceQuote.unit_number}` : ""}
                </p>
              </div>
              <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input
                      type="date"
                      value={invoiceForm.invoice_date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Milestone Name</Label>
                    <Input value={invoiceForm.milestone_name} onChange={(e) => setInvoiceForm({ ...invoiceForm, milestone_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Milestone %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={invoiceForm.milestone_percentage}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, milestone_percentage: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
                </div>
                <div className="space-y-1 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Totals</p>
                  <p className="flex items-center justify-between">
                    <span>Base amount</span>
                    <span>{formatCurrency(convertInvoiceQuote.total)}</span>
                  </p>
                  {invoiceForm.milestone_percentage && (
                    <p className="flex items-center justify-between">
                      <span>Milestone {invoiceForm.milestone_percentage}%</span>
                      <span>
                        {formatCurrency((convertInvoiceQuote.total || 0) * (parseFloat(invoiceForm.milestone_percentage) / 100))}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={closeInvoiceModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={convertInvoiceMutation.isPending}>
                    {convertInvoiceMutation.isPending ? "Generating..." : "Create Invoice"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="w-full max-w-6xl max-h-[93vh] overflow-y-auto rounded-3xl border-zinc-200 bg-white text-zinc-900">
            <CardHeader className="border-b border-zinc-200 pb-4">
              <CardTitle className="flex items-center gap-2 text-zinc-900">
                <Sparkles className="h-5 w-5 text-zinc-500" />
                Create Quotation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleCreate} className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Client & Unit</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Lead *</Label>
                        <select
                          className="flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                          value={formData.lead_id}
                          onChange={(e) => handleLeadSelect(e.target.value)}
                          required
                        >
                          <option value="">Select lead</option>
                          {leadsData?.data?.map((lead: any) => (
                            <option key={lead.id} value={lead.id}>
                              {lead.name} ({lead.phone || lead.email || lead.id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Customer Name *</Label>
                        <Input className="border-zinc-300 bg-white text-zinc-900" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Email</Label>
                        <Input className="border-zinc-300 bg-white text-zinc-900" type="email" value={formData.customer_email} onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Phone</Label>
                        <Input className="border-zinc-300 bg-white text-zinc-900" value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Valid Until</Label>
                        <DatePicker value={formData.valid_until} onChange={(value) => setFormData({ ...formData, valid_until: value })} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Project *</Label>
                        <Input
                          className="border-zinc-300 bg-white text-zinc-900"
                          value={formData.project_name}
                          onChange={(e) => {
                            const value = e.target.value
                            const normalize = (name?: string) => (name || "").trim().toLowerCase()
                            const match = (projectsData?.data || []).find((project: any) => normalize(project?.name) === normalize(value))
                            setSelectedProjectId(match?.id || null)
                            setFormData({ ...formData, project_name: value })
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Tower</Label>
                        <Input className="border-zinc-300 bg-white text-zinc-900" value={formData.tower} onChange={(e) => setFormData({ ...formData, tower: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Unit No.</Label>
                        <select
                          className="flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                          value={formData.unit_number}
                          onChange={(e) => {
                            const selected = (inventoryUnitsData?.data || []).find((unit: any) => unit.unit_number === e.target.value)
                            const tower = (projectTowersData?.data || []).find((t: any) => t.id === selected?.tower_id)
                            setFormData((prev) => ({
                              ...prev,
                              unit_number: e.target.value,
                              tower: tower?.name ? String(tower.name) : prev.tower,
                              unit_type: selected?.unit_type || prev.unit_type,
                              base_price: selected?.total_price || selected?.base_price ? String(selected.total_price || selected.base_price) : prev.base_price,
                            }))
                          }}
                        >
                          <option value="">Select unit</option>
                          {(inventoryUnitsData?.data || []).map((unit: any) => (
                            <option key={unit.id} value={unit.unit_number}>
                              {unit.unit_number} - {unit.unit_type?.toUpperCase?.() || unit.unit_type}
                            </option>
                          ))}
                        </select>
                        {!!selectedProjectId && (inventoryUnitsData?.data || []).length === 0 && (
                          <p className="text-xs text-zinc-500">No available inventory found for this project.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-700">Unit Type *</Label>
                        <Input className="border-zinc-300 bg-white text-zinc-900" value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })} required />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Pricing Components</h3>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2"><Label className="text-zinc-700">Base Price *</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} required /></div>
                      <div className="space-y-2"><Label className="text-zinc-700">Floor Premium</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.floor_premium} onChange={(e) => setFormData({ ...formData, floor_premium: e.target.value })} /></div>
                      <div className="space-y-2"><Label className="text-zinc-700">PLC</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.plc} onChange={(e) => setFormData({ ...formData, plc: e.target.value })} /></div>
                      <div className="space-y-2"><Label className="text-zinc-700">Parking</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.parking} onChange={(e) => setFormData({ ...formData, parking: e.target.value })} /></div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <div className="space-y-2"><Label className="text-zinc-700">Club</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.club_membership} onChange={(e) => setFormData({ ...formData, club_membership: e.target.value })} /></div>
                      <div className="space-y-2"><Label className="text-zinc-700">Other</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.other_charges} onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label className="text-zinc-700">GST Rate</Label>
                        <select
                          className="flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                          value={formData.gst_rate}
                          onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                        >
                          <option value="5">5%</option>
                          <option value="9">9%</option>
                          <option value="18">18%</option>
                        </select>
                      </div>
                      <div className="space-y-2"><Label className="text-zinc-700">Stamp Duty</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.stamp_duty} onChange={(e) => setFormData({ ...formData, stamp_duty: e.target.value })} /></div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label className="text-zinc-700">Registration</Label><Input className="border-zinc-300 bg-white text-zinc-900" type="number" value={formData.registration} onChange={(e) => setFormData({ ...formData, registration: e.target.value })} /></div>
                      <div className="space-y-2"><Label className="text-zinc-700">Terms & Conditions</Label><Input className="border-zinc-300 bg-white text-zinc-900" value={formData.terms_conditions} onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })} /></div>
                    </div>
                    <div className="mt-4 space-y-2"><Label className="text-zinc-700">Notes</Label><Input className="border-zinc-300 bg-white text-zinc-900" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                  </div>
                </div>

                <div className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Live Summary</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between text-zinc-600"><span>Subtotal</span><span>{formatCurrency(parsedValues.subtotal)}</span></div>
                    <div className="flex items-center justify-between text-zinc-600"><span>GST ({formData.gst_rate}%)</span><span>{formatCurrency(parsedValues.gstAmount)}</span></div>
                    <div className="flex items-center justify-between text-zinc-600"><span>Stamp Duty</span><span>{formatCurrency(parseFloat(formData.stamp_duty || "0"))}</span></div>
                    <div className="flex items-center justify-between text-zinc-600"><span>Registration</span><span>{formatCurrency(parseFloat(formData.registration || "0"))}</span></div>
                    <div className="my-3 h-px bg-zinc-200" />
                    <div className="flex items-center justify-between text-base font-semibold text-zinc-900"><span>Total</span><span>{formatCurrency(parsedValues.total)}</span></div>
                  </div>
                  <div className="mt-6 flex flex-col gap-2">
                    <Button type="submit" disabled={createMutation.isPending} className="rounded-full bg-zinc-900 text-white hover:bg-zinc-700">
                      {createMutation.isPending ? "Creating..." : "Create Quotation"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
