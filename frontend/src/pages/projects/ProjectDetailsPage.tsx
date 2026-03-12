import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { projectsApi, inventoryApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Plus,
  Settings2,
  Wand2,
  PencilLine,
  Trash2,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react"

/* ──────────── Types ──────────── */
interface Project {
  id: number
  name: string
  project_type: string
  rera_number?: string
  address?: string
  city?: string
  state?: string
  status: string
  description?: string
}

interface Tower {
  id: number
  project_id: number
  name: string
  floors_count: number
}

interface Unit {
  id: number
  tower_id: number
  floor: number
  unit_number: string
  unit_type: string
  carpet_area?: number
  built_up_area?: number
  super_built_up_area?: number
  facing?: string
  base_price?: number
  total_price?: number
  status: string
}

/* ──────────── Constants ──────────── */
const projectStatuses = [
  { value: "pre_launch", label: "Pre-launch" },
  { value: "launch", label: "Launch" },
  { value: "under_construction", label: "Under Construction" },
  { value: "ready_to_move", label: "Ready to Move" },
  { value: "completed", label: "Completed" },
]

const unitStatusOptions = [
  "available",
  "blocked",
  "booked",
  "registered",
  "sold",
]

const unitTypes = [
  { value: "1bhk", label: "1 BHK" },
  { value: "2bhk", label: "2 BHK" },
  { value: "3bhk", label: "3 BHK" },
  { value: "4bhk", label: "4 BHK" },
  { value: "5bhk", label: "5 BHK" },
  { value: "penthouse", label: "Penthouse" },
  { value: "villa", label: "Villa" },
  { value: "plot", label: "Plot" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
]

const statusColors: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  available: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", fill: "bg-emerald-500" },
  blocked: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", fill: "bg-amber-500" },
  booked: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", fill: "bg-sky-500" },
  sold: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", fill: "bg-rose-500" },
  registered: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", fill: "bg-purple-500" },
}

const projectStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pre_launch: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  launch: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  under_construction: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  ready_to_move: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  completed: { bg: "bg-zinc-100", text: "text-zinc-700", dot: "bg-zinc-500" },
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

/* ──────────── Component ──────────── */
export default function ProjectDetailsPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Edit modal and constants
  const unitStatusOptions = ["available", "blocked", "booked", "registered", "sold"]
  const unitTypes = [
    { value: "1bhk", label: "1 BHK" },
    { value: "2bhk", label: "2 BHK" },
    { value: "3bhk", label: "3 BHK" },
    { value: "4bhk", label: "4 BHK" },
    { value: "5bhk", label: "5 BHK" },
    { value: "penthouse", label: "Penthouse" },
    { value: "villa", label: "Villa" },
    { value: "plot", label: "Plot" },
    { value: "shop", label: "Shop" },
    { value: "office", label: "Office" },
  ]
  const [editFlatModal, setEditFlatModal] = useState<Unit | null>(null)
  const [editFlatData, setEditFlatData] = useState({
    unit_type: "",
    status: "available",
    super_built_up_area: 0,
    base_price: 0,
    total_price: 0,
  })
  const updateFlatMutation = useMutation({
    mutationFn: ({ unitId, payload }: { unitId: number; payload: any }) => inventoryApi.updateUnit(unitId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-units-all", projectId] })
    // Auto-populate edit modal fields when opening
    useEffect(() => {
      if (editFlatModal) {
        setEditFlatData({
          unit_type: editFlatModal.unit_type || "",
          status: editFlatModal.status || "available",
          super_built_up_area: editFlatModal.super_built_up_area || 0,
          base_price: editFlatModal.base_price || 0,
          total_price: editFlatModal.total_price || 0,
        });
      }
    }, [editFlatModal]);
      setEditFlatModal(null)
      toast({ title: "Flat updated" })
    },
    onError: (error: any) => toast({ variant: "destructive", title: "Failed", description: error?.response?.data?.detail || "Try again" }),
  })

  /* ── State ── */
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null)
  const [showAddTowerModal, setShowAddTowerModal] = useState(false)
  const [showTowerToolsModal, setShowTowerToolsModal] = useState(false)
  const [showAddFlatModal, setShowAddFlatModal] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [unitSearch, setUnitSearch] = useState("")
  const [unitStatusFilter, setUnitStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [editProjectData, setEditProjectData] = useState({
    name: "", status: "pre_launch", city: "", state: "", address: "", rera_number: "", description: "",
  })

  const [towerFormData, setTowerFormData] = useState({ name: "", floors_count: 10 })

  const [generateData, setGenerateData] = useState({
    code: "01", floors_count: 10, flats_per_floor: 4,
    unit_type: "2bhk", super_built_up_area: 1200, base_price: 6500, facing: "north",
  })

  const [confirmStatusChange, setConfirmStatusChange] = useState<{unitId: number, status: string} | null>(null);

  /* ── Queries ── */
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId).then((r) => r.data as Project),
    enabled: Number.isFinite(projectId) && projectId > 0,
  })

  const { data: towersResponse } = useQuery({
    queryKey: ["project-towers", projectId],
    queryFn: () => inventoryApi.listTowers(projectId).then((r) => r.data),
    enabled: Number.isFinite(projectId) && projectId > 0,
  })

  const { data: unitsResponse } = useQuery({
    queryKey: ["project-units-all", projectId],
    queryFn: () => inventoryApi.listUnits({ project_id: projectId, per_page: 2000 }).then((r) => r.data),
    enabled: Number.isFinite(projectId) && projectId > 0,
  })

  const towers: Tower[] = towersResponse?.data || []
  const allUnits: Unit[] = unitsResponse?.data || []

  /* ── Computed ── */
  const selectedTower = useMemo(() => towers.find((t) => t.id === selectedTowerId) || null, [towers, selectedTowerId])

  useEffect(() => {
    if (project) {
      setEditProjectData({
        name: project.name || "", status: project.status || "pre_launch",
        city: project.city || "", state: project.state || "",
        address: project.address || "", rera_number: project.rera_number || "",
        description: project.description || "",
      })
    }
  }, [project])

  useEffect(() => {
    if (towers.length === 0) { setSelectedTowerId(null); return }
    if (!selectedTowerId || !towers.some((t) => t.id === selectedTowerId)) {
      const withUnits = towers.find((t) => allUnits.some((u) => u.tower_id === t.id))
      setSelectedTowerId(withUnits?.id || towers[0].id)
    }
  }, [towers, allUnits, selectedTowerId])

  useEffect(() => { setUnitSearch(""); setUnitStatusFilter("all") }, [selectedTowerId])

  const unitsByTower = useMemo(() => {
    const map = new Map<number, Unit[]>()
    for (const u of allUnits) {
      if (!map.has(u.tower_id)) map.set(u.tower_id, [])
      map.get(u.tower_id)!.push(u)
    }
    return map
  }, [allUnits])

  const currentTowerUnits = useMemo(
    () => (selectedTowerId ? unitsByTower.get(selectedTowerId) || [] : []),
    [selectedTowerId, unitsByTower]
  )

  const filteredUnits = useMemo(
    () =>
      currentTowerUnits.filter((u) => {
        const search = !unitSearch.trim() || u.unit_number.toLowerCase().includes(unitSearch.toLowerCase()) || u.unit_type.toLowerCase().includes(unitSearch.toLowerCase())
        const status = unitStatusFilter === "all" || u.status === unitStatusFilter
        return search && status
      }),
    [currentTowerUnits, unitSearch, unitStatusFilter]
  )

  /** Floor plan: group units by floor (descending) */
  const floorPlan = useMemo(() => {
    const map = new Map<number, Unit[]>()
    for (const u of filteredUnits) {
      if (!map.has(u.floor)) map.set(u.floor, [])
      map.get(u.floor)!.push(u)
    }
    // Sort floors descending (top floor first)
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([floor, units]) => ({
        floor,
        units: units.sort((a, b) => a.unit_number.localeCompare(b.unit_number)),
      }))
  }, [filteredUnits])

  const stats = useMemo(() => {
    const calc = (units: Unit[]) => ({
      total: units.length,
      available: units.filter((u) => u.status === "available").length,
      blocked: units.filter((u) => u.status === "blocked").length,
      booked: units.filter((u) => u.status === "booked").length,
      sold: units.filter((u) => u.status === "sold" || u.status === "registered").length,
    })
    return { overall: calc(allUnits), tower: calc(currentTowerUnits) }
  }, [allUnits, currentTowerUnits])

  const occupancyPct = stats.overall.total > 0
    ? Math.round(((stats.overall.booked + stats.overall.sold) / stats.overall.total) * 100)
    : 0

  /* ── Mutations ── */
  const updateProjectMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.update(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setShowEditProject(false)
      toast({ title: "Project updated" })
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update project" }),
  })

  const addTowerMutation = useMutation({
    mutationFn: (payload: { project_id: number; name: string; floors_count: number }) => inventoryApi.createTower(payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["project-towers", projectId] })
      if (res?.data?.id) setSelectedTowerId(res.data.id)
      setShowAddTowerModal(false)
      setTowerFormData({ name: "", floors_count: 10 })
      toast({ title: "Tower added" })
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add tower" }),
  })

  const updateTowerMutation = useMutation({
    mutationFn: ({ towerId, payload }: { towerId: number; payload: any }) => inventoryApi.updateTower(towerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-towers", projectId] })
      setShowTowerToolsModal(false)
      toast({ title: "Tower updated" })
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update tower" }),
  })

  const deleteTowerMutation = useMutation({
    mutationFn: (towerId: number) => inventoryApi.deleteTower(towerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-towers", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project-units-all", projectId] })
      setShowTowerToolsModal(false)
      setSelectedTowerId(null)
      toast({ title: "Tower deleted" })
    },
    onError: (error: any) => toast({ variant: "destructive", title: "Failed", description: error?.response?.data?.detail || "Delete units first" }),
  })

  const addFlatMutation = useMutation({
    mutationFn: (payload: any) => inventoryApi.createUnit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-units-all", projectId] })
      setShowAddFlatModal(false)
      toast({ title: "Flat added" })
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add flat" }),
  })

  const generateFlatsMutation = useMutation({
    mutationFn: ({ towerId, unitsPayload }: { towerId: number; unitsPayload: any[] }) => inventoryApi.bulkCreateUnits(towerId, unitsPayload),
    onSuccess: (_r: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ["project-units-all", projectId] })
      setShowTowerToolsModal(false)
      toast({ title: "Flats generated", description: `${vars.unitsPayload.length} flats created` })
    },
    onError: (error: any) => toast({ variant: "destructive", title: "Failed", description: error?.response?.data?.detail || "Try again" }),
  })

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const updateUnitStatusMutation = useMutation({
    mutationFn: ({ unitId, status }: { unitId: number; status: string }) => {
      setStatusUpdatingId(unitId);
      return inventoryApi.updateUnit(unitId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-units-all", projectId] });
      setStatusUpdatingId(null);
      toast({ title: "Status updated", description: "Unit status changed successfully" });
    },
    onError: (error: any) => {
      setStatusUpdatingId(null);
      toast({ variant: "destructive", title: "Failed to update status", description: error?.response?.data?.detail || "Try again" });
    },
  });

  /* ── Helpers ── */
  const openTowerTools = () => {
    if (!selectedTower) { toast({ variant: "destructive", title: "Select a tower first" }); return }
    const code = selectedTower.name.replace(/[^0-9]/g, "").slice(-2) || "01"
    setTowerFormData({ name: selectedTower.name, floors_count: selectedTower.floors_count })
    setGenerateData((prev) => ({ ...prev, code: code.padStart(2, "0"), floors_count: selectedTower.floors_count || 10 }))
    setShowTowerToolsModal(true)
  }

  const buildAutoUnitsPayload = () => {
    const code = (generateData.code || "01").toUpperCase()
    const existing = new Set(currentTowerUnits.map((u) => u.unit_number))
    const payload: any[] = []
    for (let floor = 1; floor <= generateData.floors_count; floor++) {
      for (let flat = 1; flat <= generateData.flats_per_floor; flat++) {
        const num = `${code}-${String(floor).padStart(2, "0")}${flat}`
        if (existing.has(num)) continue
        payload.push({
          floor, unit_number: num, unit_type: generateData.unit_type,
          super_built_up_area: generateData.super_built_up_area, base_price: generateData.base_price,
          facing: generateData.facing, status: "available",
        })
      }
    }
    return payload
  }

  const handleGenerateFlats = () => {
    if (!selectedTower) return
    if (generateData.floors_count < 1 || generateData.flats_per_floor < 1) {
      toast({ variant: "destructive", title: "Floors and flats/floor must be ≥ 1" }); return
    }
    const payload = buildAutoUnitsPayload()
    if (payload.length === 0) { toast({ title: "No new flats to create", description: "All numbers already exist" }); return }
    generateFlatsMutation.mutate({ towerId: selectedTower.id, unitsPayload: payload })
  }

  const sc = (status: string) => statusColors[status] || statusColors.available

  /* ── Guards ── */
  if (!Number.isFinite(projectId) || projectId <= 0) return <div className="text-sm text-red-600 p-4">Invalid project id</div>
  if (projectLoading || !project) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
    </div>
  )

  const psc = projectStatusConfig[project.status] || projectStatusConfig.completed

  return (
    <div className="space-y-6">
      {/* ── Back ── */}
      <Button variant="ghost" onClick={() => navigate("/projects")} className="rounded-full text-zinc-500 hover:text-zinc-900 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Projects
      </Button>

      {/* ═══════════ Project Header ═══════════ */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: project info */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-medium">
                {project.project_type}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${psc.bg} ${psc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${psc.dot}`} />
                {projectStatuses.find((s) => s.value === project.status)?.label || project.status}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-zinc-900 leading-tight">{project.name}</h1>
            {(project.city || project.state) && (
              <p className="text-zinc-500 flex items-center gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {[project.address, project.city, project.state].filter(Boolean).join(", ")}
              </p>
            )}
            {project.rera_number && (
              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Layers className="h-3 w-3" />
                RERA: {project.rera_number}
              </p>
            )}
            <div className="pt-2">
              <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setShowEditProject(!showEditProject)}>
                <PencilLine className="h-3 w-3 mr-1" />
                {showEditProject ? "Close Editor" : "Edit Details"}
              </Button>
            </div>
          </div>

          {/* Right: stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-auto lg:min-w-[420px]">
            {[
              { label: "Total Flats", value: stats.overall.total, bg: "bg-zinc-50", border: "border-zinc-200", textColor: "text-zinc-600" },
              { label: "Available", value: stats.overall.available, bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-600" },
              { label: "Booked", value: stats.overall.booked, bg: "bg-sky-50", border: "border-sky-200", textColor: "text-sky-600" },
              { label: "Sold", value: stats.overall.sold, bg: "bg-rose-50", border: "border-rose-200", textColor: "text-rose-600" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border ${s.border}`}>
                <p className={`text-xs uppercase tracking-wider ${s.textColor}`}>{s.label}</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Occupancy bar */}
        {stats.overall.total > 0 && (
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Overall Occupancy</span>
              <span className="text-xs font-semibold text-zinc-700">{occupancyPct}%</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Project (collapsible) ── */}
      {showEditProject && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <PencilLine className="h-4 w-4" /> Edit Project Details
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input className="rounded-xl" value={editProjectData.name} onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={editProjectData.status} onValueChange={(v) => setEditProjectData({ ...editProjectData, status: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{projectStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">City</Label><Input className="rounded-xl" value={editProjectData.city} onChange={(e) => setEditProjectData({ ...editProjectData, city: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">State</Label><Input className="rounded-xl" value={editProjectData.state} onChange={(e) => setEditProjectData({ ...editProjectData, state: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Address</Label><Input className="rounded-xl" value={editProjectData.address} onChange={(e) => setEditProjectData({ ...editProjectData, address: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">RERA Number</Label><Input className="rounded-xl" value={editProjectData.rera_number} onChange={(e) => setEditProjectData({ ...editProjectData, rera_number: e.target.value })} /></div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <textarea
              className="w-full min-h-[80px] rounded-xl border border-zinc-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 resize-none"
              value={editProjectData.description} onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setShowEditProject(false)}>Cancel</Button>
            <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => updateProjectMutation.mutate(editProjectData)} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════ Towers Selector ═══════════ */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">Towers</h3>
          <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs" onClick={() => { setTowerFormData({ name: "", floors_count: 10 }); setShowAddTowerModal(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Tower
          </Button>
        </div>
        <div className="p-5">
          {towers.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">No towers yet. Add your first tower to get started.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {towers.map((tower) => {
                const isSelected = tower.id === selectedTowerId
                const towerUnits = unitsByTower.get(tower.id) || []
                const tAvail = towerUnits.filter((u) => u.status === "available").length
                const tBooked = towerUnits.filter((u) => u.status === "booked").length
                const tSold = towerUnits.filter((u) => u.status === "sold" || u.status === "registered").length
                const tTotal = towerUnits.length
                return (
                  <button
                    key={tower.id}
                    onClick={() => setSelectedTowerId(tower.id)}
                    className={`flex-shrink-0 rounded-2xl border p-4 min-w-[180px] text-left transition-all ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">Tower {tower.name}</p>
                      <span className={`text-[10px] ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}>
                        {tower.floors_count}F
                      </span>
                    </div>
                    {/* Mini occupancy bar */}
                    {tTotal > 0 ? (
                      <div className="space-y-2">
                        <div className="h-1.5 rounded-full overflow-hidden flex" style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.1)" : "#f4f4f5" }}>
                          {tSold > 0 && <div className="bg-rose-500 h-full" style={{ width: `${(tSold / tTotal) * 100}%` }} />}
                          {tBooked > 0 && <div className="bg-sky-500 h-full" style={{ width: `${(tBooked / tTotal) * 100}%` }} />}
                          {tAvail > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(tAvail / tTotal) * 100}%` }} />}
                        </div>
                        <div className="flex gap-3 text-[10px]">
                          <span>{tTotal} total</span>
                          <span className={isSelected ? "text-emerald-300" : "text-emerald-600"}>{tAvail} avail</span>
                          <span className={isSelected ? "text-sky-300" : "text-sky-600"}>{tBooked} booked</span>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-[10px] ${isSelected ? "text-zinc-400" : "text-zinc-400"}`}>No flats yet</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ Inventory Section ═══════════ */}
      {selectedTower && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-zinc-900">
                  Tower {selectedTower.name} — Inventory
                </h3>
                <Badge variant="outline" className="text-xs rounded-full">
                  {currentTowerUnits.length} flats
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={openTowerTools}>
                  <Settings2 className="h-3.5 w-3.5 mr-1" /> Tower Tools
                </Button>
                <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs" onClick={() => setShowAddFlatModal(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Flat
                </Button>
              </div>
            </div>

            {/* Tower stats */}
            <div className="flex flex-wrap gap-4 mt-4">
              {([
                ["available", stats.tower.available],
                ["blocked", stats.tower.blocked],
                ["booked", stats.tower.booked],
                ["sold", stats.tower.sold],
              ] as [string, number][]).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${sc(status).fill}`} />
                  <span className="capitalize text-zinc-600">{status}</span>
                  <span className="font-semibold text-zinc-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="px-6 py-3 border-b border-zinc-50 bg-zinc-50/50">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  className="pl-9 rounded-full text-sm h-9 bg-white"
                  placeholder="Search flat no. or type…"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                />
              </div>
              <Select value={unitStatusFilter} onValueChange={setUnitStatusFilter}>
                <SelectTrigger className="w-[140px] rounded-full text-sm h-9 bg-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {unitStatusOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex rounded-full border border-zinc-200 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}
                >
                  Floor Plan
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}
                >
                  List
                </button>
              </div>
              <span className="text-xs text-zinc-400">{filteredUnits.length} of {currentTowerUnits.length}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {currentTowerUnits.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                  <Building2 className="h-7 w-7 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-500 mb-4">No flats in this tower yet.</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs" onClick={() => setShowAddFlatModal(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Flat
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={openTowerTools}>
                    <Wand2 className="h-3.5 w-3.5 mr-1" /> Auto-Generate
                  </Button>
                </div>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500 mb-2">No flats match your search.</p>
                <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => { setUnitSearch(""); setUnitStatusFilter("all") }}>Clear Filters</Button>
              </div>
            ) : viewMode === "grid" ? (
              /* ── Floor Plan View ── */
              <div className="space-y-4">
                {floorPlan.map(({ floor, units }) => (
                  <div key={floor} className="flex items-stretch gap-4 mb-4">
                    {/* Floor label */}
                    <div className="w-20 flex-shrink-0 flex items-center justify-end pr-4">
                      <span className="text-[12px] font-medium text-zinc-400">Floor {floor}</span>
                    </div>
                    {/* Units row */}
                    <div className="flex-1 flex flex-wrap gap-2 py-2">
                      {units.map((unit) => {
                        const c = sc(unit.status)
                        return (
                          <div
                            key={unit.id}
                            className={`relative rounded-lg border ${c.border} ${c.bg} px-3 py-2 min-w-[110px] cursor-pointer transition-all hover:shadow-md`}
                            style={{ zIndex: 20 }}
                            onClick={() => setEditFlatModal(unit)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-semibold ${c.text}`}>{unit.unit_number}</span>
                              <span className={`w-2 h-2 rounded-full ${c.fill}`} />
                            </div>
                            <p className="text-[10px] text-zinc-500 capitalize mt-0.5">{unit.unit_type}</p>
                            {unit.super_built_up_area && (
                              <p className="text-[10px] text-zinc-400">{unit.super_built_up_area} sqft</p>
                            )}
                                {/* Flat Edit/Status Modal for Floor Plan */}
                              )
                                {/* Flat Edit/Status Modal - top level, outside unit loop */}
                                {editFlatModal && (
                                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                                    <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden">
                                      <div className="px-6 pt-8 pb-4 border-b border-zinc-100 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-zinc-900">Edit Flat — {editFlatModal.unit_number}</h3>
                                        <button onClick={() => setEditFlatModal(null)} className="p-2 rounded-full hover:bg-zinc-100 transition-colors"><X className="h-5 w-5 text-zinc-500" /></button>
                                      </div>
                                      <form
                                        className="px-6 py-6 space-y-4"
                                        onSubmit={(e) => {
                                          e.preventDefault();
                                          updateFlatMutation.mutate({ unitId: editFlatModal.id, payload: editFlatData });
                                        }}
                                      >
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1"><Label className="text-xs">Unit Type</Label>
                                            <select value={editFlatData.unit_type} onChange={e => setEditFlatData({ ...editFlatData, unit_type: e.target.value })} className="w-full h-9 rounded-xl border border-zinc-200 px-3 text-sm">
                                              {unitTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                          </div>
                                          <div className="space-y-1"><Label className="text-xs">Status</Label>
                                            <select value={editFlatData.status} onChange={e => setEditFlatData({ ...editFlatData, status: e.target.value })} className="w-full h-9 rounded-xl border border-zinc-200 px-3 text-sm">
                                              {unitStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1"><Label className="text-xs">Area (sqft)</Label><Input className="rounded-xl" type="number" min={1} value={editFlatData.super_built_up_area} onChange={e => setEditFlatData({ ...editFlatData, super_built_up_area: Number(e.target.value) })} /></div>
                                          <div className="space-y-1"><Label className="text-xs">Base Price (/sqft)</Label><Input className="rounded-xl" type="number" min={1} value={editFlatData.base_price} onChange={e => setEditFlatData({ ...editFlatData, base_price: Number(e.target.value) })} /></div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                          <Button type="button" variant="outline" className="rounded-full" onClick={() => setEditFlatModal(null)}>Cancel</Button>
                                          <Button type="submit" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" disabled={updateFlatMutation.isPending}>{updateFlatMutation.isPending ? "Saving…" : "Save Changes"}</Button>
                                        </div>
                                      </form>
                                    </div>
                                  </div>
                                )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── List View ── */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Flat</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Floor</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Area</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Price</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnits.map((unit) => {
                      const c = sc(unit.status)
                      return (
                        <tr key={unit.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                          <td className="py-2.5 px-3 font-medium text-zinc-900">{unit.unit_number}</td>
                          <td className="py-2.5 px-3 capitalize text-zinc-600">{unit.unit_type}</td>
                          <td className="py-2.5 px-3 text-zinc-600">{unit.floor}</td>
                          <td className="py-2.5 px-3 text-zinc-600">{unit.super_built_up_area || "—"} sqft</td>
                          <td className="py-2.5 px-3 text-zinc-600">{unit.total_price ? formatCurrency(unit.total_price) : "—"}</td>
                          <td className="py-2.5 px-3">
                            <Select
                              value={unit.status}
                              onValueChange={(v) => setConfirmStatusChange({ unitId: unit.id, status: v })}
                              disabled={updateUnitStatusMutation.isPending && statusUpdatingId === unit.id}
                            >
                              <SelectTrigger className={`h-7 w-[120px] rounded-full text-xs ${c.bg} ${c.border} ${c.text} border`}>
                                <SelectValue />
                                {updateUnitStatusMutation.isPending && statusUpdatingId === unit.id && (
                                  <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {unitStatusOptions.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${sc(s).fill}`} />
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2.5 px-3">
                            <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => setEditFlatModal(unit)}>
                              <PencilLine className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          {currentTowerUnits.length > 0 && (
            <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex flex-wrap gap-4">
              {(["available", "blocked", "booked", "sold", "registered"] as const).map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className={`w-2.5 h-2.5 rounded-sm ${sc(s).fill}`} />
                  <span className="capitalize">{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Modals ═══════════ */}
      {/* Status Change Confirmation Modal */}
      {confirmStatusChange && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Change Status</h3>
              <button onClick={() => setConfirmStatusChange(null)} className="p-1.5 rounded-full hover:bg-zinc-100"><X className="h-4 w-4 text-zinc-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-700">Are you sure you want to change the status of this flat to <span className="font-semibold capitalize">{confirmStatusChange.status}</span>?</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setConfirmStatusChange(null)}>Cancel</Button>
                <Button type="button" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => {
                  updateUnitStatusMutation.mutate({ unitId: confirmStatusChange.unitId, status: confirmStatusChange.status })
                  setConfirmStatusChange(null)
                }} disabled={updateUnitStatusMutation.isPending}>
                  {updateUnitStatusMutation.isPending ? "Updating…" : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tower Modal */}
      {showAddTowerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Add Tower</h3>
              <button onClick={() => setShowAddTowerModal(false)} className="p-1.5 rounded-full hover:bg-zinc-100"><X className="h-4 w-4 text-zinc-500" /></button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                addTowerMutation.mutate({ project_id: projectId, name: towerFormData.name.trim(), floors_count: towerFormData.floors_count })
              }}
            >
              <div className="space-y-2"><Label className="text-xs">Tower Name</Label><Input className="rounded-xl" value={towerFormData.name} onChange={(e) => setTowerFormData({ ...towerFormData, name: e.target.value })} placeholder="e.g., A" required /></div>
              <div className="space-y-2"><Label className="text-xs">Floors Count</Label><Input className="rounded-xl" type="number" min={1} value={towerFormData.floors_count} onChange={(e) => setTowerFormData({ ...towerFormData, floors_count: Number(e.target.value || 0) })} required /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowAddTowerModal(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" disabled={addTowerMutation.isPending}>{addTowerMutation.isPending ? "Adding…" : "Add Tower"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Flat Modal */}
      {showAddFlatModal && selectedTower && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Add Flat — Tower {selectedTower.name}</h3>
              <button onClick={() => setShowAddFlatModal(false)} className="p-1.5 rounded-full hover:bg-zinc-100"><X className="h-4 w-4 text-zinc-500" /></button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                addFlatMutation.mutate({
                  tower_id: selectedTower.id,
                  floor: Number(fd.get("floor") || 0),
                  unit_number: String(fd.get("unit_number") || "").trim(),
                  unit_type: String(fd.get("unit_type") || "2bhk"),
                  super_built_up_area: Number(fd.get("super_built_up_area") || 0),
                  base_price: Number(fd.get("base_price") || 0),
                  facing: String(fd.get("facing") || "north"),
                })
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Floor</Label><Input className="rounded-xl" name="floor" type="number" min={1} required /></div>
                <div className="space-y-1"><Label className="text-xs">Flat Number</Label><Input className="rounded-xl" name="unit_number" placeholder="01-001" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Unit Type</Label>
                  <select name="unit_type" defaultValue="2bhk" className="w-full h-9 rounded-xl border border-zinc-200 px-3 text-sm">
                    {unitTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Facing</Label>
                  <select name="facing" defaultValue="north" className="w-full h-9 rounded-xl border border-zinc-200 px-3 text-sm">
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Area (sqft)</Label><Input className="rounded-xl" name="super_built_up_area" type="number" min={1} required /></div>
                <div className="space-y-1"><Label className="text-xs">Base Price (/sqft)</Label><Input className="rounded-xl" name="base_price" type="number" min={1} required /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowAddFlatModal(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" disabled={addFlatMutation.isPending}>{addFlatMutation.isPending ? "Adding…" : "Add Flat"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tower Tools Modal */}
      {showTowerToolsModal && selectedTower && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden max-h-[94vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-zinc-900">Tower Tools — {selectedTower.name}</h3>
              <button onClick={() => setShowTowerToolsModal(false)} className="p-1.5 rounded-full hover:bg-zinc-100"><X className="h-4 w-4 text-zinc-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Edit Tower */}
              <div className="rounded-2xl border border-zinc-200 p-5 space-y-3">
                <p className="font-medium text-sm text-zinc-900">Edit Tower</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name</Label><Input className="rounded-xl" value={towerFormData.name} onChange={(e) => setTowerFormData({ ...towerFormData, name: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Floors</Label><Input className="rounded-xl" type="number" min={1} value={towerFormData.floors_count} onChange={(e) => setTowerFormData({ ...towerFormData, floors_count: Number(e.target.value || 0) })} /></div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                    onClick={() => updateTowerMutation.mutate({ towerId: selectedTower.id, payload: { name: towerFormData.name.trim(), floors_count: towerFormData.floors_count } })}
                    disabled={updateTowerMutation.isPending}
                  >{updateTowerMutation.isPending ? "Saving…" : "Save Tower"}</Button>
                </div>
              </div>

              {/* Auto-Generate Flats */}
              <div className="rounded-2xl border border-zinc-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-zinc-500" />
                  <p className="font-medium text-sm text-zinc-900">Auto-Generate Flats</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Tower Code</Label><Input className="rounded-lg text-sm" value={generateData.code} onChange={(e) => setGenerateData({ ...generateData, code: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })} placeholder="01" /></div>
                  <div className="space-y-1"><Label className="text-xs">Floors</Label><Input className="rounded-lg text-sm" type="number" min={1} value={generateData.floors_count} onChange={(e) => setGenerateData({ ...generateData, floors_count: Number(e.target.value || 0) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Flats/Floor</Label><Input className="rounded-lg text-sm" type="number" min={1} value={generateData.flats_per_floor} onChange={(e) => setGenerateData({ ...generateData, flats_per_floor: Number(e.target.value || 0) })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Type</Label>
                    <Select value={generateData.unit_type} onValueChange={(v) => setGenerateData({ ...generateData, unit_type: v })}>
                      <SelectTrigger className="rounded-lg text-sm h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{unitTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Area (sqft)</Label><Input className="rounded-lg text-sm" type="number" min={1} value={generateData.super_built_up_area} onChange={(e) => setGenerateData({ ...generateData, super_built_up_area: Number(e.target.value || 0) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Base Price</Label><Input className="rounded-lg text-sm" type="number" min={1} value={generateData.base_price} onChange={(e) => setGenerateData({ ...generateData, base_price: Number(e.target.value || 0) })} /></div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Facing</Label>
                  <Select value={generateData.facing} onValueChange={(v) => setGenerateData({ ...generateData, facing: v })}>
                    <SelectTrigger className="rounded-lg text-sm h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north">North</SelectItem>
                      <SelectItem value="south">South</SelectItem>
                      <SelectItem value="east">East</SelectItem>
                      <SelectItem value="west">West</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-zinc-50 p-2.5 text-xs text-zinc-500 space-y-0.5">
                  <p>Preview: <span className="font-medium text-zinc-700">{(generateData.code || "01").toUpperCase()}-011</span> → <span className="font-medium text-zinc-700">{(generateData.code || "01").toUpperCase()}-{String(Math.max(1, generateData.floors_count)).padStart(2, "0")}{Math.max(1, generateData.flats_per_floor)}</span></p>
                  <p>{Math.max(0, generateData.floors_count) * Math.max(0, generateData.flats_per_floor)} flats total. Existing numbers are skipped.</p>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs" onClick={handleGenerateFlats} disabled={generateFlatsMutation.isPending}>
                    {generateFlatsMutation.isPending ? (<><div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white mr-1.5" />Generating…</>) : "Generate Flats"}
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
                <p className="font-medium text-sm text-red-700">Danger Zone</p>
                <p className="text-xs text-red-600">Delete tower only when no flats are linked.</p>
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" className="rounded-full text-xs"
                    onClick={() => deleteTowerMutation.mutate(selectedTower.id)} disabled={deleteTowerMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {deleteTowerMutation.isPending ? "Deleting…" : "Delete Tower"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
