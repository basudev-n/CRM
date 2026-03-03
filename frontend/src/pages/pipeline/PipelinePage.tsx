import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { GripVertical, Plus, RefreshCw } from "lucide-react"

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

export default function PipelinePage() {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [isDragging, setIsDragging] = useState(false)
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

  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: number; newStatus: string }) => {
      const response = await api.patch(`/pipeline/leads/${leadId}/stage?new_status=${newStatus}`)
      return response.data
    },
    onMutate: async ({ leadId, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["pipeline-kanban"] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<KanbanData>(["pipeline-kanban"])

      if (previousData && draggedLead) {
        // Optimistically update the UI
        const newLeads = { ...previousData.leads }

        // Remove from old stage
        Object.keys(newLeads).forEach((stageName) => {
          newLeads[stageName] = newLeads[stageName].filter((l) => l.id !== leadId)
        })

        // Add to new stage
        if (!newLeads[newStatus]) {
          newLeads[newStatus] = []
        }
        newLeads[newStatus].push({ ...draggedLead, status: newStatus } as Lead)

        queryClient.setQueryData(["pipeline-kanban"], {
          ...previousData,
          leads: newLeads,
        })
      }

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["pipeline-kanban"], context.previousData)
      }
      toast({ variant: "destructive", title: "Failed to move lead" })
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["pipeline-kanban"] })
    },
  })

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
    // Set drag image
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
    if (draggedLead && draggedLead.status !== newStatus) {
      moveLeadMutation.mutate({ leadId: draggedLead.id, newStatus })
      toast({ title: `Lead moved to ${newStatus}` })
    }
    handleDragEnd()
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1">Drag and drop leads between stages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
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
            className={`flex-shrink-0 w-80 transition-opacity ${
              isDragging ? "opacity-50" : "opacity-100"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.name)}
          >
            <div
              className="rounded-lg border bg-gray-50 min-h-[500px]"
              style={{ borderTop: `4px solid ${stage.color}` }}
            >
              {/* Stage Header */}
              <div className="p-3 border-b bg-white rounded-t-lg sticky top-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                  <Badge variant="secondary" className="bg-gray-100">
                    {leadsByStage[stage.name]?.length || 0}
                  </Badge>
                </div>
              </div>

              {/* Stage Content */}
              <div className="p-2 space-y-2 min-h-[440px]">
                {leadsByStage[stage.name]?.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white p-3 rounded-lg border shadow-sm cursor-move hover:shadow-md transition-all hover:border-primary/50 ${
                      draggedLead?.id === lead.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                        {lead.email && (
                          <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                        )}
                      </div>
                      <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lead.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : lead.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {lead.priority}
                      </span>
                      {lead.source && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {lead.source}
                        </span>
                      )}
                    </div>
                    {lead.score > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{lead.score}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {(!leadsByStage[stage.name] || leadsByStage[stage.name].length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    No leads in this stage
                    <br />
                    <span className="text-xs">Drag leads here</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Priority:</span>
            <span className="flex items-center gap-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              High
            </span>
            <span className="flex items-center gap-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Medium
            </span>
            <span className="flex items-center gap-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Low
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
