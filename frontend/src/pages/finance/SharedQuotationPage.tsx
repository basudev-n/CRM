import { useMemo } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { financeApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, Link2, XCircle } from "lucide-react"

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0)

const statusClasses = (status?: string) => {
  switch (status) {
    case "accepted":
      return "border-emerald-400/30 bg-emerald-50 text-emerald-600"
    case "rejected":
      return "border-rose-400/30 bg-rose-50 text-rose-600"
    default:
      return "border-amber-400/30 bg-amber-50 text-amber-600"
  }
}

const shareStatusClasses = (status?: string) => {
  switch (status) {
    case "accepted":
      return "text-emerald-600"
    case "rejected":
      return "text-rose-600"
    default:
      return "text-amber-600"
  }
}

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
}

type SharedQuotationPayload = {
  share: {
    token: string
    share_url: string
    status: string
    expires_at?: string
    created_at: string
    organisation_name?: string
    organisation_logo?: string
    organisation_address?: string
  }
  quotation: QuotationRecord
}

export default function SharedQuotationPage() {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()

  const { data, error, refetch } = useQuery<SharedQuotationPayload>({
    queryKey: ["shared-quotation", token],
    queryFn: () => financeApi.getSharedQuotation(token!).then((res) => res.data),
    enabled: !!token,
  })

  const actionMutation = useMutation({
    mutationFn: (action: "approve" | "reject") => financeApi.actionSharedQuotation(token!, { action }),
    onSuccess: () => {
      toast({ title: "Response recorded" })
      refetch()
    },
    onError: () => toast({ variant: "destructive", title: "Could not record your response" }),
  })

  const quotation = data?.quotation
  const share = data?.share

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

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950/5 flex items-center justify-center">
        <p className="text-sm text-zinc-500">Invalid share link.</p>
      </div>
    )
  }

  const handleAction = (action: "approve" | "reject") => {
    const message =
      action === "approve"
        ? "Approving will lock the quotation and notify the team. Proceed?"
        : "Rejecting will mark the quotation declined. Proceed?"
    if (window.confirm(message)) {
      actionMutation.mutate(action)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950/5 flex items-center justify-center px-4">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
          <p className="font-semibold text-lg">Unable to load quotation</p>
          <p className="text-sm mt-2">This link might have expired or already been used.</p>
        </div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-zinc-950/5 flex items-center justify-center">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Loading quotation details…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950/5 py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
    <Card className="rounded-3xl border border-zinc-200 p-6 shadow-lg">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Shared Quotation</p>
            <h1 className="text-2xl font-semibold text-zinc-900">{quotation?.quotation_number}</h1>
          </div>
          <div className="flex items-center gap-2">
            {share && (
              <Badge className={`border ${statusClasses(share.status)}`}>{share.status}</Badge>
            )}
            {quotation && (
              <Badge className={`border ${statusClasses(quotation.status)}`}>{quotation.status}</Badge>
            )}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-start gap-3">
            {share?.organisation_logo ? (
              <img
                src={share.organisation_logo}
                alt={share.organisation_name}
                className="h-14 w-14 rounded-2xl border border-zinc-200 object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-500">
                {share?.organisation_name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900">{share?.organisation_name || "Your Company"}</p>
              <p className="text-xs text-zinc-500">{share?.organisation_address || "Company address not provided"}</p>
            </div>
          </div>
          {share && share.share_url && (
            <div className="text-sm text-zinc-600">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400">Share link</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Link2 className="h-4 w-4" />
                <a className="font-medium text-sky-600 underline-offset-2 hover:underline" href={share.share_url} target="_blank" rel="noreferrer">
                  {share.share_url}
                </a>
              </div>
              {share.expires_at && (
                <p className="mt-2 text-xs text-zinc-500">
                  Expires on {new Date(share.expires_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>

        <Card className="rounded-3xl border border-zinc-200">
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Customer</p>
                <p className="text-lg font-semibold text-zinc-900">{quotation?.customer_name}</p>
                <p className="text-sm text-zinc-500">{quotation?.customer_email || "-"}</p>
                <p className="text-sm text-zinc-500">{quotation?.customer_phone || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Project</p>
                <p className="text-lg font-semibold text-zinc-900">{quotation?.project_name}</p>
                <p className="text-sm text-zinc-500">
                  {quotation?.tower ? `Tower ${quotation.tower}` : "-"}
                  {quotation?.unit_number ? ` · Unit ${quotation.unit_number}` : ""}
                </p>
                <p className="text-sm text-zinc-500">{quotation?.unit_type}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-zinc-400">Valid Until</p>
                <p className="text-lg font-semibold text-zinc-900">{quotation?.valid_until ? new Date(quotation.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-zinc-400">Area</p>
                <p className="text-lg font-semibold text-zinc-900">{quotation?.area_sqft ? `${quotation.area_sqft} sq.ft` : "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-zinc-400">Total</p>
                <p className="text-lg font-semibold text-zinc-900">{formatCurrency(quotation?.total)}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-600">
              {pricingRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <span>{formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-zinc-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Respond</p>
              <p className={`text-sm ${shareStatusClasses(share?.status)}`}>Share status: {share?.status || "pending"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="flex items-center gap-2"
                onClick={() => handleAction("approve")}
                disabled={share?.status !== "pending" || actionMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleAction("reject")}
                disabled={share?.status !== "pending" || actionMutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Approving this quotation will update its status for the sales team. Rejecting will mark it declined.
          </p>
        </Card>
      </div>
    </div>
  )
}
