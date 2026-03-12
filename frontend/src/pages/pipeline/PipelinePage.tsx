import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import {
  GripVertical,
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoveRight,
  Search,
  Filter,
  X,
  Clock,
  AlertTriangle,
  IndianRupee,
  TrendingUp,
  Users,
  Trophy,
  XCircle,
  Eye,
  ExternalLink,
} from "lucide-react"

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
  budget_min: number | null
  budget_max: number | null
  project_interest: string | null
  created_at: string | null
  updated_at: string | null
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

// --- Helpers ---
function formatBudget(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`
  if (val >= 100000) return `${(val / 100000).toFixed(1)}L`
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`
  return val.toLocaleString("en-IN")
}

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function timeAgoLabel(dateStr: string | null): string {
  const days = daysAgo(dateStr)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function PipelinePage() {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [showLostModal, setShowLostModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState("")
  const [pendingLeadForLost, setPendingLeadForLost] = useState<Lead | null>(null)
  const [lostReason, setLostReason] = useState("")
  const [showAddStageModal, setShowAddStageModal] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const [newStageColor, setNewStageColor] = useState("#6366f1")
  const [moveMenuLeadId, setMoveMenuLeadId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const navigate = useNavigate()

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
    mutationFn: async ({
      leadId,
      newStatus,
      lostReason,
    }: {
      leadId: number
      newStatus: string
      lostReason?: string
    }) => {
      const response = await api.patch(`/pipeline/leads/${leadId}/stage`, null, {
        params: {
          new_status: newStatus,
          ...(lostReason ? { lost_reason: lostReason } : {}),
        },
      })
      return response.data
    },
    onMutate: async ({ leadId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline-kanban"] })
      const previousData = queryClient.getQueryData<KanbanData>(["pipeline-kanban"])

      if (previousData) {
        const movedLead =
          draggedLead ||
          Object.values(previousData.leads)
            .flat()
            .find((l) => l.id === leadId)

        if (movedLead) {
          const newLeads = { ...previousData.leads }
          Object.keys(newLeads).forEach((stageName) => {
            newLeads[stageName] = newLeads[stageName].filter((l) => l.id !== leadId)
          })
          if (!newLeads[newStatus]) newLeads[newStatus] = []
          newLeads[newStatus].push({ ...movedLead, status: newStatus } as Lead)
          queryClient.setQueryData(["pipeline-kanban"], { ...previousData, leads: newLeads })
        }
      }
      return { previousData }
    },
    onError: (err: any, _variables, context) => {
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

  // --- Computed: filtered leads ---
  const stages: Stage[] = data?.stages || []
  const rawLeadsByStage: Record<string, Lead[]> = data?.leads || {}

  const filteredLeadsByStage = useMemo(() => {
    const result: Record<string, Lead[]> = {}
    for (const [stageName, leads] of Object.entries(rawLeadsByStage)) {
      let filtered = leads
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (l) =>
            l.name?.toLowerCase().includes(q) ||
            l.email?.toLowerCase().includes(q) ||
            l.phone?.includes(q)
        )
      }
      if (priorityFilter !== "all") {
        filtered = filtered.filter((l) => l.priority === priorityFilter)
      }
      result[stageName] = filtered
    }
    return result
  }, [rawLeadsByStage, searchQuery, priorityFilter])

  // --- Computed: pipeline stats ---
  const pipelineStats = useMemo(() => {
    const allLeads = Object.values(rawLeadsByStage).flat()
    const totalLeads = allLeads.length
    const wonStages = new Set(stages.filter((s) => s.is_won).map((s) => s.name))
    const lostStages = new Set(stages.filter((s) => s.is_lost).map((s) => s.name))
    const activeStages = new Set(
      stages.filter((s) => !s.is_won && !s.is_lost).map((s) => s.name)
    )

    const wonCount = allLeads.filter((l) => wonStages.has(l.status)).length
    const lostCount = allLeads.filter((l) => lostStages.has(l.status)).length
    const activeCount = allLeads.filter((l) => activeStages.has(l.status)).length

    const staleCount = allLeads.filter(
      (l) => activeStages.has(l.status) && daysAgo(l.updated_at || l.created_at) > 7
    ).length

    const conversionRate =
      wonCount + lostCount > 0
        ? Math.round((wonCount / (wonCount + lostCount)) * 100)
        : 0

    return { totalLeads, wonCount, lostCount, activeCount, staleCount, conversionRate }
  }, [rawLeadsByStage, stages])

  const hasActiveFilters = searchQuery.trim() !== "" || priorityFilter !== "all"

  // --- Toggle collapse ---
  const toggleCollapse = (stageName: string) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageName)) next.delete(stageName)
      else next.add(stageName)
      return next
    })
  }

  // --- Auto-scroll when dragging near edges ---
  const handleAutoScroll = useCallback((clientX: number) => {
    const container = scrollContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const edgeZone = 80
    const scrollSpeed = 12
    if (clientX < rect.left + edgeZone) {
      container.scrollLeft -= scrollSpeed
    } else if (clientX > rect.right - edgeZone) {
      container.scrollLeft += scrollSpeed
    }
  }, [])

  const handleBoardDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      handleAutoScroll(e.clientX)
    },
    [handleAutoScroll]
  )

  // --- Drag handlers ---
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", lead.id.toString())
    requestAnimationFrame(() => setIsDragging(true))
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setIsDragging(false)
    setDragOverStage(null)
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current)
      autoScrollRef.current = null
    }
  }

  const handleColumnDragOver = (e: React.DragEvent, stageName: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDragOverStage(stageName)
    handleAutoScroll(e.clientX)
  }

  const handleColumnDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as Node).contains(related)) return
    setDragOverStage(null)
  }

  const executeDrop = (lead: Lead, newStatus: string) => {
    const stage = data?.stages.find((s) => s.name === newStatus)
    if (stage?.is_lost) {
      setPendingLeadForLost(lead)
      setPendingStatus(newStatus)
      setShowLostModal(true)
    } else {
      moveLeadMutation.mutate({ leadId: lead.id, newStatus })
      toast({ title: `Lead moved to ${newStatus}` })
    }
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverStage(null)
    if (!draggedLead) return
    executeDrop(draggedLead, newStatus)
    handleDragEnd()
  }

  const handleQuickMove = (lead: Lead, newStatus: string) => {
    setMoveMenuLeadId(null)
    executeDrop(lead, newStatus)
  }

  const handleLostConfirm = () => {
    const lead = pendingLeadForLost || draggedLead
    if (!lead || !pendingStatus) return
    if (!lostReason) {
      toast({ variant: "destructive", title: "Please select a reason" })
      return
    }
    moveLeadMutation.mutate({
      leadId: lead.id,
      newStatus: pendingStatus,
      lostReason,
    })
    toast({ title: `Lead marked as lost` })
    setShowLostModal(false)
    setLostReason("")
    setPendingStatus("")
    setPendingLeadForLost(null)
  }

  const handleAddStage = () => {
    if (!newStageName) {
      toast({ variant: "destructive", title: "Please enter a stage name" })
      return
    }
    const order = data?.stages?.length || 0
    createStageMutation.mutate({ name: newStageName, color: newStageColor, order })
  }

  // Close move menu on outside click
  useEffect(() => {
    if (moveMenuLeadId === null) return
    const close = () => setMoveMenuLeadId(null)
    const timer = setTimeout(() => document.addEventListener("click", close), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("click", close)
    }
  }, [moveMenuLeadId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ======== Header ======== */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Deal <span className="font-semibold">Pipeline</span>
          </h1>
          <p className="text-zinc-500 mt-2">
            Move opportunities fluidly across every stage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-full border-zinc-300 hover:bg-zinc-100"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
            onClick={() => setShowAddStageModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Stage
          </Button>
        </div>
      </div>

      {/* ======== Pipeline Stats ======== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Total Leads",
            value: pipelineStats.totalLeads,
            icon: Users,
            color: "text-zinc-700",
            bg: "bg-zinc-50",
          },
          {
            label: "Active",
            value: pipelineStats.activeCount,
            icon: TrendingUp,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Won",
            value: pipelineStats.wonCount,
            icon: Trophy,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
          {
            label: "Lost",
            value: pipelineStats.lostCount,
            icon: XCircle,
            color: "text-red-700",
            bg: "bg-red-50",
          },
          {
            label: "Stale (7d+)",
            value: pipelineStats.staleCount,
            icon: AlertTriangle,
            color: pipelineStats.staleCount > 0 ? "text-amber-700" : "text-zinc-500",
            bg: pipelineStats.staleCount > 0 ? "bg-amber-50" : "bg-zinc-50",
          },
          {
            label: "Win Rate",
            value: `${pipelineStats.conversionRate}%`,
            icon: TrendingUp,
            color: "text-violet-700",
            bg: "bg-violet-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-2xl border border-zinc-100 p-3.5 flex items-center gap-3`}
          >
            <div
              className={`${stat.color} p-2 rounded-xl bg-white/80 border border-zinc-100`}
            >
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900">{stat.value}</p>
              <p className="text-[11px] text-zinc-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ======== Search & Filter Bar ======== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, email, phone..."
            className="pl-9 rounded-xl border-zinc-200 bg-white h-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className={`rounded-xl border-zinc-200 h-10 px-3 gap-2 ${
            showFilters ? "bg-zinc-100" : ""
          }`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="bg-zinc-900 text-white text-[10px] rounded-full px-1.5 py-0.5 font-medium">
              {(searchQuery.trim() ? 1 : 0) + (priorityFilter !== "all" ? 1 : 0)}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-zinc-500 hover:text-zinc-700 h-10"
            onClick={() => {
              setSearchQuery("")
              setPriorityFilter("all")
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Priority:
          </span>
          {["all", "high", "medium", "low"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                priorityFilter === p
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* ======== Floating drop zone bar (visible only while dragging) ======== */}
      {isDragging && stages.length > 0 && (
        <div className="sticky top-0 z-40 -mx-2">
          <div className="bg-white/90 backdrop-blur-lg border border-zinc-200 rounded-2xl shadow-lg px-3 py-2.5 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
              <MoveRight className="h-3.5 w-3.5" />
              Drop here
            </span>
            {stages.map((stage) => {
              const isOver = dragOverStage === stage.name
              const isCurrent = draggedLead?.status === stage.name
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "move"
                    setDragOverStage(stage.name)
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => handleDrop(e, stage.name)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                    transition-all duration-150 cursor-pointer whitespace-nowrap
                    border-2 border-dashed
                    ${
                      isCurrent
                        ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
                        : isOver
                          ? "border-zinc-900 bg-zinc-900 text-white scale-105 shadow-md"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400"
                    }
                  `}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.name}
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${
                      isOver && !isCurrent
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200/60 text-zinc-600"
                    }`}
                  >
                    {rawLeadsByStage[stage.name]?.length || 0}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ======== Kanban Board ======== */}
      <div
        ref={scrollContainerRef}
        onDragOver={handleBoardDragOver}
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ scrollBehavior: "auto" }}
      >
        {stages.map((stage) => {
          const isDropTarget = isDragging && dragOverStage === stage.name
          const isCurrentStage = draggedLead?.status === stage.name
          const isCollapsed = collapsedStages.has(stage.name)
          const stageLeads = filteredLeadsByStage[stage.name] || []
          const totalStageLeads = rawLeadsByStage[stage.name]?.length || 0

          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 transition-all duration-200 ${
                isCollapsed ? "w-16" : "w-80"
              }`}
              onDragOver={(e) => handleColumnDragOver(e, stage.name)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleDrop(e, stage.name)}
            >
              <div
                className={`
                  rounded-2xl border bg-zinc-50 shadow-sm
                  transition-all duration-200
                  ${
                    isDropTarget && !isCurrentStage
                      ? "border-zinc-900 bg-zinc-100 ring-2 ring-zinc-900/10 scale-[1.01]"
                      : "border-zinc-200"
                  }
                  ${isCollapsed ? "min-h-[500px]" : "min-h-[500px]"}
                `}
                style={{ borderTop: `4px solid ${stage.color}` }}
              >
                {/* Column header */}
                <div
                  className={`border-b border-zinc-200 bg-white rounded-t-2xl ${
                    isCollapsed ? "p-2" : "p-3"
                  }`}
                >
                  {isCollapsed ? (
                    /* Collapsed header — vertical */
                    <button
                      onClick={() => toggleCollapse(stage.name)}
                      className="w-full flex flex-col items-center gap-2 py-2 text-zinc-700 hover:text-zinc-900"
                      title={`Expand ${stage.name}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="font-semibold text-xs [writing-mode:vertical-lr] rotate-180">
                        {stage.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-zinc-100 text-zinc-700 text-[10px] px-1.5"
                      >
                        {totalStageLeads}
                      </Badge>
                    </button>
                  ) : (
                    /* Expanded header */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCollapse(stage.name)}
                          className="p-0.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                          title="Collapse column"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <h3 className="font-semibold text-zinc-900 text-sm">
                          {stage.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasActiveFilters && stageLeads.length !== totalStageLeads && (
                          <span className="text-[10px] text-zinc-400">
                            {stageLeads.length}/
                          </span>
                        )}
                        <Badge
                          variant="secondary"
                          className="bg-zinc-100 text-zinc-700"
                        >
                          {totalStageLeads}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cards — only when expanded */}
                {!isCollapsed && (
                  <div className="p-2 space-y-2 min-h-[440px]">
                    {isDropTarget && !isCurrentStage && (
                      <div className="border-2 border-dashed border-zinc-400 rounded-xl p-3 text-center text-xs text-zinc-500 bg-white/60">
                        Drop here to move to <strong>{stage.name}</strong>
                      </div>
                    )}

                    {stageLeads.length === 0 &&
                      !isDropTarget &&
                      totalStageLeads === 0 && (
                        <div className="text-center py-8 text-zinc-400">
                          <p className="text-xs">No leads in this stage</p>
                        </div>
                      )}

                    {stageLeads.length === 0 &&
                      totalStageLeads > 0 &&
                      hasActiveFilters && (
                        <div className="text-center py-6 text-zinc-400">
                          <Search className="h-5 w-5 mx-auto mb-1.5 opacity-50" />
                          <p className="text-xs">No matching leads</p>
                        </div>
                      )}

                    {stageLeads.map((lead) => {
                      const staleDays = daysAgo(lead.updated_at || lead.created_at)
                      const isStale =
                        staleDays > 7 && !stage.is_won && !stage.is_lost
                      const hasBudget = lead.budget_min || lead.budget_max

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          className={`
                            group relative bg-white p-3 rounded-xl border shadow-sm
                            cursor-grab active:cursor-grabbing
                            transition-all duration-150
                            ${
                              draggedLead?.id === lead.id
                                ? "opacity-40 scale-95 border-zinc-300"
                                : isStale
                                  ? "border-amber-200 hover:shadow-md hover:border-amber-300"
                                  : "border-zinc-200 hover:shadow-md hover:border-zinc-300"
                            }
                          `}
                        >
                          {/* Stale indicator bar */}
                          {isStale && (
                            <div className="absolute top-0 left-3 right-3 h-0.5 bg-amber-400 rounded-full" />
                          )}

                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => navigate(`/leads`)}
                                className="font-medium text-zinc-900 truncate block hover:text-zinc-600 transition-colors text-left w-full"
                                title="View lead"
                              >
                                {lead.name}
                              </button>
                              {lead.email && (
                                <p className="text-sm text-zinc-500 truncate">
                                  {lead.email}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                              {/* View lead */}
                              <button
                                onClick={() => navigate(`/leads`)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                                title="View lead"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Move-to button */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMoveMenuLeadId(
                                      moveMenuLeadId === lead.id ? null : lead.id
                                    )
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                                  title="Move to stage"
                                >
                                  <MoveRight className="h-3.5 w-3.5" />
                                </button>

                                {/* Move-to dropdown */}
                                {moveMenuLeadId === lead.id && (
                                  <div
                                    className="absolute right-0 top-8 z-50 w-52 bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 animate-in fade-in slide-in-from-top-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-3 py-1.5 border-b border-zinc-100">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                                        Move to stage
                                      </p>
                                    </div>
                                    {stages.map((s) => {
                                      const isCurrent = s.name === lead.status
                                      return (
                                        <button
                                          key={s.id}
                                          disabled={isCurrent}
                                          onClick={() =>
                                            handleQuickMove(lead, s.name)
                                          }
                                          className={`
                                            w-full text-left px-3 py-2 text-sm flex items-center gap-2
                                            transition-colors
                                            ${
                                              isCurrent
                                                ? "text-zinc-400 bg-zinc-50 cursor-not-allowed"
                                                : "text-zinc-700 hover:bg-zinc-50"
                                            }
                                          `}
                                        >
                                          <span
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: s.color }}
                                          />
                                          <span className="flex-1">{s.name}</span>
                                          {isCurrent && (
                                            <span className="text-[10px] font-medium text-zinc-400">
                                              Current
                                            </span>
                                          )}
                                          {!isCurrent && (
                                            <ChevronRight className="h-3 w-3 text-zinc-400" />
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              <GripVertical className="h-4 w-4 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
                            </div>
                          </div>

                          {/* Tags row: priority, source, budget */}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                lead.priority === "high"
                                  ? "bg-red-50 text-red-700"
                                  : lead.priority === "medium"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-green-50 text-green-700"
                              }`}
                            >
                              {lead.priority}
                            </span>
                            {lead.source && (
                              <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                                {lead.source}
                              </span>
                            )}
                            {hasBudget && (
                              <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded inline-flex items-center gap-0.5">
                                <IndianRupee className="h-2.5 w-2.5" />
                                {lead.budget_min && lead.budget_max
                                  ? `${formatBudget(lead.budget_min)} – ${formatBudget(lead.budget_max)}`
                                  : lead.budget_max
                                    ? `Up to ${formatBudget(lead.budget_max)}`
                                    : `${formatBudget(lead.budget_min!)}`}
                              </span>
                            )}
                          </div>

                          {/* Bottom row: score + staleness */}
                          <div className="mt-2 flex items-center gap-2">
                            {lead.score > 0 && (
                              <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      lead.score >= 70
                                        ? "bg-emerald-500"
                                        : lead.score >= 40
                                          ? "bg-zinc-900"
                                          : "bg-zinc-400"
                                    }`}
                                    style={{ width: `${lead.score}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-zinc-500 font-medium w-5 text-right">
                                  {lead.score}
                                </span>
                              </div>
                            )}
                            <span
                              className={`text-[10px] font-medium flex items-center gap-0.5 ml-auto ${
                                isStale
                                  ? "text-amber-600"
                                  : "text-zinc-400"
                              }`}
                              title={
                                lead.updated_at
                                  ? `Last updated: ${new Date(lead.updated_at).toLocaleDateString()}`
                                  : lead.created_at
                                    ? `Created: ${new Date(lead.created_at).toLocaleDateString()}`
                                    : ""
                              }
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgoLabel(lead.updated_at || lead.created_at)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ======== Lost Reason Modal ======== */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <CardHeader>
              <CardTitle>Mark as Lost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500">
                Please select a reason for marking this lead as lost:
              </p>
              <div className="space-y-2">
                {lostReasons.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="lostReason"
                      value={reason}
                      checked={lostReason === reason}
                      onChange={(e) => setLostReason(e.target.value)}
                      className="accent-zinc-900"
                    />
                    <span className="text-sm">{reason}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setShowLostModal(false)
                    setLostReason("")
                    setPendingLeadForLost(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-full bg-zinc-900 hover:bg-zinc-800"
                  onClick={handleLostConfirm}
                  disabled={!lostReason}
                >
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======== Add Stage Modal ======== */}
      {showAddStageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
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
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {[
                    "#6366f1",
                    "#10b981",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStageColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        newStageColor === color
                          ? "border-zinc-900 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setShowAddStageModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-full bg-zinc-900 hover:bg-zinc-800"
                  onClick={handleAddStage}
                  disabled={createStageMutation.isPending}
                >
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
