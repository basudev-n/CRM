import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { financeApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  FileText,
  IndianRupee,
  Building2,
  User,
  Mail,
  Phone,
  Ruler,
  Calendar,
  Link2,
  Send,
} from "lucide-react"

type QuotationRecord = {
  quotation_number: string
  status: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  project_name: string
  tower?: string
  unit_number?: string
  unit_type: string
  area_sqft?: number
  total: number
  valid_until?: string
  base_price: number
  floor_premium?: number
  plc?: number
  parking?: number
  club_membership?: number
  other_charges?: number
  gst_amount: number
  stamp_duty?: number
  registration?: number
  terms_conditions?: string
  notes?: string
  created_at?: string
}

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  draft: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Draft" },
  sent: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: "Sent" },
  accepted: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Accepted" },
  rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Rejected" },
  expired: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Expired" },
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (value?: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function QuotationPreviewPage() {
  const { quotationId } = useParams<{ quotationId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [shareLink, setShareLink] = useState("")
  const [shareStatus, setShareStatus] = useState("")

  const parsedId = Number(quotationId)

  const { data, isLoading, error } = useQuery<QuotationRecord>({
    queryKey: ["quotation-preview", parsedId],
    queryFn: () => financeApi.getQuotation(parsedId).then((res) => res.data),
    enabled: !!quotationId,
  })

  const shareMutation = useMutation({
    mutationFn: () => financeApi.createQuotationShare(parsedId),
    onSuccess: (res) => {
      setShareLink(res.data.share_url)
      setShareStatus(res.data.status)
      toast({ title: "Share link ready", description: "Copy the link and send it to your client." })
    },
    onError: () => toast({ variant: "destructive", title: "Could not generate share link" }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => financeApi.updateQuotation(parsedId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation-preview", parsedId] })
      toast({ title: "Status updated" })
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
  })

  const quotation = data

  const pricingRows = useMemo(() => {
    if (!quotation) return []
    const rows: Array<{ label: string; value?: number }> = [
      { label: "Base Price", value: quotation.base_price },
    ]
    if (quotation.floor_premium) rows.push({ label: "Floor Premium", value: quotation.floor_premium })
    if (quotation.plc) rows.push({ label: "PLC", value: quotation.plc })
    if (quotation.parking) rows.push({ label: "Parking", value: quotation.parking })
    if (quotation.club_membership) rows.push({ label: "Club Membership", value: quotation.club_membership })
    if (quotation.other_charges) rows.push({ label: "Other Charges", value: quotation.other_charges })
    return rows
  }, [quotation])

  const subtotal = pricingRows.reduce((acc, r) => acc + (r.value || 0), 0)

  const copyLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      toast({ title: "Copied link", description: "Share it with your client." })
    } catch {
      toast({ variant: "destructive", title: "Copy failed" })
    }
  }

  const downloadPdf = async () => {
    if (!quotation) return
    try {
      const res = await financeApi.downloadQuotationPdf(parsedId)
      const blob = new Blob([res.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `quotation_${quotation.quotation_number}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast({ variant: "destructive", title: "Failed to download PDF" })
    }
  }

  if (!quotationId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Quotation not specified.</p>
      </div>
    )
  }

  const sc = statusConfig[quotation?.status || "draft"] || statusConfig.draft

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-500">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {quotation && (
            <>
              <span className="text-zinc-300">/</span>
              <h1 className="text-2xl font-semibold text-zinc-900">{quotation.quotation_number}</h1>
              <Badge className={`border ${sc.border} ${sc.bg} ${sc.text}`}>{sc.label}</Badge>
            </>
          )}
        </div>
        {quotation && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 appearance-none rounded-full border border-zinc-200 bg-white px-4 pr-8 text-xs font-medium text-zinc-700 outline-none transition hover:border-zinc-400"
              value={quotation.status}
              onChange={(e) => updateStatusMutation.mutate(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-zinc-200"
              onClick={downloadPdf}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              size="sm"
              className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {shareMutation.isPending ? "Generating..." : "Share with Client"}
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Loading quotation preview...
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
          Failed to load quotation preview.
        </div>
      )}

      {quotation && (
        <>
          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Customer & Project Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100">
                      <User className="h-4 w-4 text-zinc-600" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Customer</p>
                  </div>
                  <p className="text-lg font-semibold text-zinc-900">{quotation.customer_name}</p>
                  {quotation.customer_email && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{quotation.customer_email}</span>
                    </div>
                  )}
                  {quotation.customer_phone && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{quotation.customer_phone}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100">
                      <Building2 className="h-4 w-4 text-zinc-600" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Project</p>
                  </div>
                  <p className="text-lg font-semibold text-zinc-900">{quotation.project_name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {quotation.tower ? `Tower ${quotation.tower}` : ""}
                    {quotation.unit_number ? ` · Unit ${quotation.unit_number}` : ""}
                  </p>
                  <p className="text-sm text-zinc-500">{quotation.unit_type}</p>
                  {quotation.area_sqft && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                      <Ruler className="h-3.5 w-3.5" />
                      <span>{quotation.area_sqft} sq.ft</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Breakdown Card */}
              <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100">
                    <IndianRupee className="h-4 w-4 text-zinc-600" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Price Breakdown</p>
                </div>
                <div className="space-y-3">
                  {pricingRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">{row.label}</span>
                      <span className="font-medium text-zinc-900">{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                  <div className="my-1 h-px bg-zinc-100" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-medium text-zinc-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">GST</span>
                    <span className="font-medium text-zinc-900">{formatCurrency(quotation.gst_amount)}</span>
                  </div>
                  {quotation.stamp_duty ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">Stamp Duty</span>
                      <span className="font-medium text-zinc-900">{formatCurrency(quotation.stamp_duty)}</span>
                    </div>
                  ) : null}
                  {quotation.registration ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">Registration</span>
                      <span className="font-medium text-zinc-900">{formatCurrency(quotation.registration)}</span>
                    </div>
                  ) : null}
                  <div className="my-1 h-px bg-zinc-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-zinc-900">Total</span>
                    <span className="text-xl font-bold text-zinc-900">{formatCurrency(quotation.total)}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Notes */}
              {(quotation.terms_conditions || quotation.notes) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {quotation.terms_conditions && (
                    <div className="rounded-3xl border border-zinc-200 bg-[#F7F5F2] p-6">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Terms & Conditions
                      </p>
                      <p className="text-sm leading-relaxed text-zinc-700">{quotation.terms_conditions}</p>
                    </div>
                  )}
                  {quotation.notes && (
                    <div className="rounded-3xl border border-zinc-200 bg-[#F7F5F2] p-6">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Notes</p>
                      <p className="text-sm leading-relaxed text-zinc-700">{quotation.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Total Card - Dark */}
              <div className="rounded-3xl bg-zinc-900 p-6 text-white">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Total Amount</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(quotation.total)}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Valid till {formatDate(quotation.valid_until)}</span>
                </div>
                {quotation.created_at && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Created {formatDate(quotation.created_at)}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions Card */}
              <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Quick Actions</p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start rounded-xl border-zinc-200 text-zinc-700"
                    onClick={downloadPdf}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start rounded-xl border-zinc-200 text-zinc-700"
                    onClick={() => shareMutation.mutate()}
                    disabled={shareMutation.isPending}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {shareMutation.isPending ? "Generating..." : "Generate Share Link"}
                  </Button>
                </div>
              </div>

              {/* Share Link Card */}
              {shareLink && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Share Link</p>
                    {shareStatus && (
                      <Badge className="border border-sky-200 bg-sky-50 text-sky-700 text-[10px]">
                        {shareStatus}
                      </Badge>
                    )}
                  </div>
                  <Input className="mb-2 border-zinc-200 text-xs" value={shareLink} readOnly />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={copyLink}>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl text-xs"
                      onClick={() => window.open(shareLink, "_blank")}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Open
                    </Button>
                  </div>
                </div>
              )}

              {/* Meta Card */}
              <div className="rounded-3xl border border-zinc-200 bg-[#F7F5F2] p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status</span>
                    <Badge className={`border ${sc.border} ${sc.bg} ${sc.text} text-[10px]`}>{sc.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Unit Type</span>
                    <span className="font-medium text-zinc-900">{quotation.unit_type}</span>
                  </div>
                  {quotation.area_sqft && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Area</span>
                      <span className="font-medium text-zinc-900">{quotation.area_sqft} sq.ft</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Valid Until</span>
                    <span className="font-medium text-zinc-900">{formatDate(quotation.valid_until)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
