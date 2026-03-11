import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { financeApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Plus } from "lucide-react"

export default function CostSheetsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    project_name: "",
    tower: "",
    unit_type: "2bhk",
    area_sqft: "",
    base_rate: "",
    floor_premium_rate: "",
    plc_amount: "",
    parking_charge: "",
    club_membership: "",
    other_charges: "",
    gst_percentage: "5",
    stamp_duty_percentage: "5",
    registration_percentage: "1",
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["cost-sheets"],
    queryFn: () => financeApi.listCostSheets().then((res) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: any) => financeApi.createCostSheet(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-sheets"] })
      setShowCreateModal(false)
      toast({ title: "Cost sheet created" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create cost sheet", description: error?.response?.data?.detail || "Please try again" })
    },
  })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      project_name: formData.project_name,
      tower: formData.tower || null,
      unit_type: formData.unit_type,
      area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
      base_rate: parseFloat(formData.base_rate || "0"),
      floor_premium_rate: formData.floor_premium_rate ? parseFloat(formData.floor_premium_rate) : null,
      plc_amount: formData.plc_amount ? parseFloat(formData.plc_amount) : null,
      parking_charge: formData.parking_charge ? parseFloat(formData.parking_charge) : null,
      club_membership: formData.club_membership ? parseFloat(formData.club_membership) : null,
      other_charges: formData.other_charges ? parseFloat(formData.other_charges) : null,
      gst_percentage: parseFloat(formData.gst_percentage || "5"),
      stamp_duty_percentage: parseFloat(formData.stamp_duty_percentage || "5"),
      registration_percentage: parseFloat(formData.registration_percentage || "1"),
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">Cost <span className="font-semibold">Sheets</span></h1>
          <p className="text-zinc-500 mt-2">Build project-wise pricing templates</p>
        </div>
        <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-6" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Cost Sheet
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {data?.map((sheet: any) => (
                <div key={sheet.id} className="p-4 flex items-start gap-4 hover:bg-zinc-50">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{sheet.project_name}</p>
                    <p className="text-sm text-zinc-500">
                      {sheet.unit_type.toUpperCase()} {sheet.tower ? `- Tower ${sheet.tower}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(sheet.grand_total)}</p>
                    <p className="text-xs text-zinc-500">v{sheet.version}</p>
                  </div>
                </div>
              ))}
              {data?.length === 0 && (
                <div className="text-center py-10 text-zinc-500">No cost sheets found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Create Cost Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input value={formData.project_name} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tower</Label>
                    <Input value={formData.tower} onChange={(e) => setFormData({ ...formData, tower: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Type *</Label>
                    <Input value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Area (sqft)</Label>
                    <Input type="number" value={formData.area_sqft} onChange={(e) => setFormData({ ...formData, area_sqft: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Base Rate *</Label>
                    <Input type="number" value={formData.base_rate} onChange={(e) => setFormData({ ...formData, base_rate: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Floor Premium Rate</Label>
                    <Input type="number" value={formData.floor_premium_rate} onChange={(e) => setFormData({ ...formData, floor_premium_rate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>PLC</Label>
                    <Input type="number" value={formData.plc_amount} onChange={(e) => setFormData({ ...formData, plc_amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Parking</Label>
                    <Input type="number" value={formData.parking_charge} onChange={(e) => setFormData({ ...formData, parking_charge: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Club Membership</Label>
                    <Input type="number" value={formData.club_membership} onChange={(e) => setFormData({ ...formData, club_membership: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Charges</Label>
                    <Input type="number" value={formData.other_charges} onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>GST %</Label>
                    <Input type="number" value={formData.gst_percentage} onChange={(e) => setFormData({ ...formData, gst_percentage: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stamp Duty %</Label>
                    <Input type="number" value={formData.stamp_duty_percentage} onChange={(e) => setFormData({ ...formData, stamp_duty_percentage: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration %</Label>
                    <Input type="number" value={formData.registration_percentage} onChange={(e) => setFormData({ ...formData, registration_percentage: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
