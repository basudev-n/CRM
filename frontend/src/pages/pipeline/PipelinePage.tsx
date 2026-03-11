import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { GripVertical, Plus, RefreshCw, X } from "lucide-react"

interface Lead {
  id: number
  name: string
  email: string
  phone: string
  priority: string
  score: number
  source: string
  status: string
  assigned_to: number | null
  updated_at: string
}

interface Stage {
  id: number
  name: string
  color: string
  order: number
  is_won: boolean
  is_lost: boolean
}

interface KanbanData {
  stages: Stage[]
  leads: Record<string, Lead[]>
}

const lostReasons = [
  "Not interested",
  "Budget issue",
  "Looking elsewhere",
  "Not ready to buy",
  "Competitor chose",
  "No response",
  "Other",
]

export default function PipelinePage() {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState("")
  const [lostReason, setLostReason] = useState("")
  const [showAddStageModal, setShowAddStageModal] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const [newStageColor, setNewStageColor] = useState("#6366f1")
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading, refetch } = useQuery<KanbanData>({
    queryKey: ["pipeline-kanban"],
    queryFn: async () => {
      const response = await api.get("/pipeline/kanban")
      return response.data
    },
    staleTime: 0,
  })

  const createStageMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; order: number }) => {
      const response = await api.post("/pipeline/stages", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-kanban"] })
      setShowAddStageModal(false)
      setNewStageName("")
      toast({ title: "Stage created" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create stage" })
    },
  })

  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, newStatus, lostReason }: { leadId: number; newStatus: string; lostReason?: string }) => {
      const response = await api.patch(
        `/pipeline/leads/${leadId}/stage`,
        null,
        {
          params: {
            new_status: newStatus,
            ...(lostReason ? { lost_reason: lostReason } : {}),
          },
        }
      )
      return response.data
    },
    onMutate: async ({ leadId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline-kanban"] })
      const previousData = queryClient.getQueryData<KanbanData>(["pipeline-kanban"])

      if (previousData && draggedLead) {
        const newLeads = { ...previousData.leads }
        Object.keys(newLeads).forEach((stageName) => {
          newLeads[stageName] = newLeads[stageName].filter((l) => l.id !== leadId)
        })
        if (!newLeads[newStatus]) newLeads[newStatus] = []
        newLeads[newStatus].push({ ...draggedLead, status: newStatus } as Lead)

        queryClient.setQueryData(["pipeline-kanban"], { ...previousData, leads: newLeads })
      }
      return { previousData }
    },
    onError: (err: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["pipeline-kanban"], context.previousData)
      }
      toast({
        variant: "destructive",
        title: "Failed to move lead",
        description: err?.response?.data?.detail || "Please try again",
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-kanban"] })
    },
  })

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", lead.id.toString())
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    if (!draggedLead) return

    const stage = data?.stages.find(s => s.name === newStatus)
    if (stage?.is_lost) {
      setPendingStatus(newStatus)
      setShowLostModal(true)
    } else {
      moveLeadMutation.mutate({ leadId: draggedLead.id, newStatus })
      toast({ title: `Lead moved to ${newStatus}` })
    }
    handleDragEnd()
  }

  const handleLostConfirm = () => {
    if (!draggedLead || !pendingStatus) return
    if (!lostReason) {
      toast({ variant: "destructive", title: "Please select a reason" })
      return
    }
    moveLeadMutation.mutate({ leadId: draggedLead.id, newStatus: pendingStatus, lostReason })
    toast({ title: `Lead marked as lost` })
    setShowLostModal(false)
    setLostReason("")
    setPendingStatus("")
  }

  const handleAddStage = () => {
    if (!newStageName) {
      toast({ variant: "destructive", title: "Please enter a stage name" })
      return
    }
    const order = data?.stages?.length || 0
    createStageMutation.mutate({ name: newStageName, color: newStageColor, order })
  }

  const stages: Stage[] = data?.stages || []
  const leadsByStage: Record<string, Lead[]> = data?.leads || {}

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Deal <span className="font-semibold">Pipeline</span>
          </h1>
          <p className="text-zinc-500 mt-2">Move opportunities fluidly across every stage.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full border-zinc-300 hover:bg-zinc-100" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => setShowAddStageModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Stage
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-80 transition-opacity ${isDragging ? "opacity-50" : "opacity-100"}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.name)}
          >
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 min-h-[500px] shadow-sm" style={{ borderTop: `4px solid ${stage.color}` }}>
              <div className="p-3 border-b border-zinc-200 bg-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900">{stage.name}</h3>
                  <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
                    {leadsByStage[stage.name]?.length || 0}
                  </Badge>
                </div>
              </div>

              <div className="p-2 space-y-2 min-h-[440px]">
                {leadsByStage[stage.name]?.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white p-3 rounded-xl border border-zinc-200 shadow-sm cursor-move hover:shadow-md transition-all hover:border-zinc-400 ${draggedLead?.id === lead.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 truncate">{lead.name}</p>
                        {lead.email && <p className="text-sm text-zinc-500 truncate">{lead.email}</p>}
                      </div>
                      <GripVertical className="h-4 w-4 text-zinc-400 flex-shrink-0 ml-2" />
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lead.priority === "high" ? "bg-red-100 text-red-700" :
                        lead.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {lead.priority}
                      </span>
                      {lead.source && (
                        <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">{lead.source}</span>
                      )}
                    </div>
                    {lead.score > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full" style={{ width: `${lead.score}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 font-medium">{lead.score}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Mark as Lost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500">Please select a reason for marking this lead as lost:</p>
              <div className="space-y-2">
                {lostReasons.map((reason) => (
                  <label key={reason} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-zinc-50">
                    <input
                      type="radio"
                      name="lostReason"
                      value={reason}
                      checked={lostReason === reason}
                      onChange={(e) => setLostReason(e.target.value)}
                      className="accent-indigo-600"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowLostModal(false); setLostReason("") }}>
                  Cancel
                </Button>
                <Button onClick={handleLostConfirm} disabled={!lostReason}>
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Stage Modal */}
      {showAddStageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Add New Stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Stage Name</Label>
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g., Proposal Sent"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStageColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${newStageColor === color ? "border-zinc-900" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddStageModal(false)}>Cancel</Button>
                <Button onClick={handleAddStage} disabled={createStageMutation.isPending}>
                  {createStageMutation.isPending ? "Creating..." : "Create Stage"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
