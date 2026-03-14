import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { financeApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Copy, ExternalLink } from "lucide-react"

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
}

const statusClasses = (status?: string) => {
  switch (status) {
    case "accepted":
      return "border-emerald-400/40 bg-emerald-50 text-emerald-600"
    case "sent":
      return "border-sky-400/40 bg-sky-50 text-sky-600"
    case "rejected":
      return "border-rose-400/40 bg-rose-50 text-rose-600"
    case "expired":
      return "border-rose-400/40 bg-rose-50 text-rose-600"
    default:
      return "border-amber-400/40 bg-amber-50 text-amber-600"
  }
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0)

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
  const [shareLink, setShareLink] = useState<string>("")
  const [shareStatus, setShareStatus] = useState<string>("")

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
    rows.push({ label: `GST (${quotation.gst_amount ? "Calculated" : "0"})`, value: quotation.gst_amount })
    if (quotation.stamp_duty) rows.push({ label: "Stamp Duty", value: quotation.stamp_duty })
    if (quotation.registration) rows.push({ label: "Registration", value: quotation.registration })
    return rows
  }, [quotation])

  const copyLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      toast({ title: "Copied link", description: "Share it with your client." })
    } catch {
      toast({ variant: "destructive", title: "Copy failed" })
    }
  }

  if (!quotationId) {
    return (
      <div className="min-h-screen bg-zinc-950/5 flex items-center justify-center">
        <p className="text-sm text-zinc-500">Quotation not specified.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950/5 py-8">
      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotations
          </Button>
          {quotation && (
            <Badge className={`border ${statusClasses(quotation.status)}`}>{quotation.status}</Badge>
          )}
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
            Loading quotation preview...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Failed to load quotation preview.
          </div>
        )}

        {quotation && (
          <>
            <Card className="overflow-hidden rounded-3xl border border-zinc-200">
              <CardContent className="space-y-6 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Customer</p>
                    <p className="text-lg font-semibold text-zinc-900">{quotation.customer_name}</p>
                    <p className="text-sm text-zinc-500">{quotation.customer_email || "-"}</p>
                    <p className="text-sm text-zinc-500">{quotation.customer_phone || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Project</p>
                    <p className="text-lg font-semibold text-zinc-900">{quotation.project_name}</p>
                    <p className="text-sm text-zinc-500">
                      {quotation.tower ? `Tower ${quotation.tower}` : ""}
                      {quotation.unit_number ? ` · Unit ${quotation.unit_number}` : ""}
                    </p>
                    <p className="text-sm text-zinc-500">{quotation.unit_type}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-zinc-400">Valid Until</p>
                    <p className="text-lg font-semibold text-zinc-900">{formatDate(quotation.valid_until)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-zinc-400">Area</p>
                    <p className="text-lg font-semibold text-zinc-900">
                      {quotation.area_sqft ? `${quotation.area_sqft} sq.ft` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-zinc-400">Total</p>
                    <p className="text-lg font-semibold text-zinc-900">{formatCurrency(quotation.total)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {pricingRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm text-zinc-600">
                      <span>{row.label}</span>
                      <span>{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  <p className="font-semibold text-zinc-800">Terms</p>
                  <p>{quotation.terms_conditions || "No terms added."}</p>
                </div>
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  <p className="font-semibold text-zinc-800">Notes</p>
                  <p>{quotation.notes || "No additional notes."}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-zinc-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Shareable preview</p>
                  <p className="text-xs text-zinc-500">The client can approve or reject using this link.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => shareMutation.mutate()}
                  disabled={shareMutation.isPending}
                >
                  {shareMutation.isPending ? "Generating..." : "Create share link"}
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {shareLink && (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input className="flex-1 border-zinc-200" value={shareLink} readOnly />
                    <Button size="sm" variant="outline" onClick={copyLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy link
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(shareLink, "_blank")}> 
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open share page
                    </Button>
                  </div>
                )}
                {shareStatus && (
                  <p className="text-xs text-zinc-500">Share status: {shareStatus}</p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
