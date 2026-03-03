import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, MapPin, User, Plus, Clock } from "lucide-react"

interface Visit {
  id: number
  lead_id: number
  scheduled_date: string
  project_name: string
  location: string
  remarks: string
  outcome: string
  feedback: string
  completed_at: string
  lead: {
    id: number
    name: string
    phone: string
  }
  agent: {
    id: number
    first_name: string
    last_name: string
  }
}

export default function VisitsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    lead_id: "",
    scheduled_date: "",
    project_name: "",
    location: "",
    remarks: "",
    assigned_agent_id: "",
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["visits", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", "20")
      if (statusFilter !== "all") params.append("status_filter", statusFilter)
      return api.get(`/visits?${params}`).then((res) => res.data)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/visits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] })
      setShowCreateModal(false)
      setFormData({
        lead_id: "",
        scheduled_date: "",
        project_name: "",
        location: "",
        remarks: "",
        assigned_agent_id: "",
      })
      toast({ title: "Site visit scheduled" })
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || "Failed to schedule visit"
      toast({ variant: "destructive", title: message })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      lead_id: parseInt(formData.lead_id),
      assigned_agent_id: parseInt(formData.assigned_agent_id),
    })
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "interested":
        return "success"
      case "not_interested":
        return "destructive"
      case "follow_up":
        return "warning"
      case "booked":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Visits</h1>
          <p className="text-gray-500 mt-1">Schedule and manage site visits</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Visit
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "scheduled" ? "default" : "outline"}
          onClick={() => setStatusFilter("scheduled")}
        >
          Scheduled
        </Button>
        <Button
          variant={statusFilter === "completed" ? "default" : "outline"}
          onClick={() => setStatusFilter("completed")}
        >
          Completed
        </Button>
      </div>

      {/* Visits List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-10">Loading...</div>
        ) : data?.data?.length > 0 ? (
          data.data.map((visit: Visit) => (
            <Card key={visit.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{visit.lead?.name || "Lead"}</CardTitle>
                    <p className="text-sm text-gray-500">{visit.project_name || "Site Visit"}</p>
                  </div>
                  {visit.outcome && (
                    <Badge variant={getOutcomeColor(visit.outcome)}>
                      {visit.outcome.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {new Date(visit.scheduled_date).toLocaleString()}
                  </div>
                  {visit.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {visit.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    {visit.agent?.first_name} {visit.agent?.last_name}
                  </div>
                  {visit.remarks && (
                    <p className="text-gray-500 mt-2">{visit.remarks}</p>
                  )}
                </div>
                {!visit.completed_at && (
                  <Button variant="outline" className="w-full mt-4">
                    Mark Complete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            No visits found
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Schedule Site Visit</CardTitle>
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
                  <Label htmlFor="scheduled_date">Date & Time *</Label>
                  <Input
                    id="scheduled_date"
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_name">Project Name</Label>
                  <Input
                    id="project_name"
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_agent_id">Assign Agent *</Label>
                  <Input
                    id="assigned_agent_id"
                    type="number"
                    value={formData.assigned_agent_id}
                    onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <textarea
                    id="remarks"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Scheduling..." : "Schedule Visit"}
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
