import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Plus,
  Search,
  Building2,
  MapPin,
  X,
  Sparkles,
  CheckCircle2,
  ChevronRight,
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
  created_at: string
}

interface TowerPlan {
  id: number
  name: string
  code: string
  floors_count: number
  flats_per_floor: number
  auto_create_flats: boolean
  unit_type: string
  super_built_up_area: number
  base_price: number
  facing: string
}

/* ──────────── Constants ──────────── */
const projectTypes = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed", label: "Mixed Use" },
]

const projectStatuses = [
  { value: "pre_launch", label: "Pre-launch" },
  { value: "launch", label: "Launch" },
  { value: "under_construction", label: "Under Construction" },
  { value: "ready_to_move", label: "Ready to Move" },
  { value: "completed", label: "Completed" },
]

const unitTypes = [
  { value: "1bhk", label: "1 BHK" },
  { value: "2bhk", label: "2 BHK" },
  { value: "3bhk", label: "3 BHK" },
  { value: "4bhk", label: "4 BHK" },
  { value: "5bhk", label: "5 BHK" },
  { value: "penthouse", label: "Penthouse" },
  { value: "villa", label: "Villa" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
]

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pre_launch: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  launch: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  under_construction: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  ready_to_move: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  completed: { bg: "bg-zinc-100", text: "text-zinc-700", dot: "bg-zinc-500" },
}

/* ──────────── Component ──────────── */
export default function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  /* ── List State ── */
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  /* ── Create Modal State ── */
  const initialProjectDraft = {
    name: "",
    project_type: "residential",
    status: "pre_launch",
    city: "",
    state: "",
    address: "",
    rera_number: "",
    description: "",
  }

  const createInitialTowerPlan = (id: number): TowerPlan => ({
    id,
    name: `Tower ${id}`,
    code: String(id).padStart(2, "0"),
    floors_count: 10,
    flats_per_floor: 4,
    auto_create_flats: true,
    unit_type: "2bhk",
    super_built_up_area: 1200,
    base_price: 6500,
    facing: "north",
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [step, setStep] = useState(1)
  const [projectDraft, setProjectDraft] = useState(initialProjectDraft)
  const [towerPlans, setTowerPlans] = useState<TowerPlan[]>([createInitialTowerPlan(1)])

  /* ── Computed ── */
  const inventorySummary = useMemo(() => {
    const towers = towerPlans.filter((p) => p.name.trim())
    const autoUnits = towers.reduce((acc, p) => {
      if (!p.auto_create_flats) return acc
      return acc + Math.max(0, p.floors_count) * Math.max(0, p.flats_per_floor)
    }, 0)
    return { towers: towers.length, autoUnits }
  }, [towerPlans])

  /* ── Queries ── */
  const { data, isLoading } = useQuery({
    queryKey: ["projects", page, search, statusFilter],
    queryFn: () =>
      projectsApi
        .list({ page, per_page: 12, search: search || undefined, status: statusFilter || undefined })
        .then((r) => r.data),
  })

  /* ── Mutations ── */
  const createProjectMutation = useMutation({
    mutationFn: (d: any) => projectsApi.create(d),
    onError: () => toast({ variant: "destructive", title: "Failed to create project" }),
  })

  /* ── Tower Plan Helpers ── */
  const updateTowerPlan = (id: number, u: Partial<TowerPlan>) =>
    setTowerPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...u } : p)))

  const addTowerPlanRow = () =>
    setTowerPlans((prev) => [...prev, createInitialTowerPlan(prev.length + 1)])

  const removeTowerPlanRow = (id: number) =>
    setTowerPlans((prev) => prev.filter((p) => p.id !== id))

  const cloneDefaultsToAllTowers = () => {
    const base = towerPlans[0]
    if (!base) return
    setTowerPlans((prev) =>
      prev.map((p, i) =>
        i === 0
          ? p
          : {
              ...p,
              flats_per_floor: base.flats_per_floor,
              auto_create_flats: base.auto_create_flats,
              unit_type: base.unit_type,
              super_built_up_area: base.super_built_up_area,
              base_price: base.base_price,
              facing: base.facing,
            }
      )
    )
    toast({ title: "Applied Tower 1 defaults to all towers" })
  }

  const buildAutoUnits = (plan: TowerPlan) => {
    const units: any[] = []
    for (let floor = 1; floor <= plan.floors_count; floor++) {
      for (let flat = 1; flat <= plan.flats_per_floor; flat++) {
        units.push({
          floor,
          unit_number: `${plan.code}-${String(floor).padStart(2, "0")}${flat}`,
          unit_type: plan.unit_type,
          super_built_up_area: plan.super_built_up_area,
          base_price: plan.base_price,
          facing: plan.facing,
          status: "available",
        })
      }
    }
    return units
  }

  const getTowerNumberPreview = (plan: TowerPlan) => {
    const code = (plan.code || "01").toUpperCase()
    return {
      first: `${code}-011`,
      last: `${code}-${String(Math.max(1, plan.floors_count)).padStart(2, "0")}${Math.max(1, plan.flats_per_floor)}`,
    }
  }

  const validateTowerPlans = () => {
    const active = towerPlans.filter((p) => p.name.trim())
    if (active.length === 0) {
      toast({ variant: "destructive", title: "Add at least one tower" })
      return false
    }
    const codes = new Set<string>()
    for (const p of active) {
      if (!p.code.trim()) {
        toast({ variant: "destructive", title: `Tower code missing for ${p.name}` })
        return false
      }
      const upper = p.code.trim().toUpperCase()
      if (codes.has(upper)) {
        toast({ variant: "destructive", title: `Duplicate tower code: ${p.code}` })
        return false
      }
      codes.add(upper)
      if (p.floors_count < 1) {
        toast({ variant: "destructive", title: `Floors must be ≥ 1 for ${p.name}` })
        return false
      }
      if (p.auto_create_flats && p.flats_per_floor < 1) {
        toast({ variant: "destructive", title: `Flats/floor must be ≥ 1 for ${p.name}` })
        return false
      }
    }
    return true
  }

  /* ── Handlers ── */
  const openCreateModal = () => {
    setProjectDraft(initialProjectDraft)
    setTowerPlans([createInitialTowerPlan(1)])
    setStep(1)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setTowerPlans([createInitialTowerPlan(1)])
    setStep(1)
    setShowCreateModal(false)
  }

  const handleCreateProject = async () => {
    if (!projectDraft.name.trim()) {
      toast({ variant: "destructive", title: "Project name is required" })
      setStep(1)
      return
    }
    if (!validateTowerPlans()) {
      setStep(4)
      return
    }
    try {
      const res = await createProjectMutation.mutateAsync(projectDraft)
      const created = res.data
      let totalUnits = 0
      const active = towerPlans.filter((p) => p.name.trim())

      for (const plan of active) {
        const towerRes = await inventoryApi.createTower({
          project_id: created.id,
          name: plan.name.trim(),
          floors_count: Number(plan.floors_count) || 0,
        })
        if (plan.auto_create_flats && plan.floors_count > 0 && plan.flats_per_floor > 0) {
          const units = buildAutoUnits(plan)
          await inventoryApi.bulkCreateUnits(towerRes.data.id, units)
          totalUnits += units.length
        }
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] })
      closeCreateModal()
      toast({
        title: "Project created",
        description: `${active.length} tower(s), ${totalUnits} flat(s) auto-created`,
      })
      navigate(`/projects/${created.id}`)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create project",
        description: error?.response?.data?.detail || "Please review and try again",
      })
    }
  }

  const projects: Project[] = data?.data || []
  const meta = data?.meta || { pages: 1, total: 0 }

  const getStatusLabel = (s: string) =>
    projectStatuses.find((ps) => ps.value === s)?.label || s

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Your <span className="font-semibold">Projects</span>
          </h1>
          <p className="text-zinc-500 mt-2">Manage real estate projects and inventory</p>
        </div>
        <Button onClick={openCreateModal} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-6">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search projects…"
            className="pl-9 rounded-full bg-white border-zinc-200"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-[180px] rounded-full bg-white border-zinc-200">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {projectStatuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Summary ── */}
      {!isLoading && meta.total > 0 && (
        <p className="text-sm text-zinc-400">{meta.total} project{meta.total !== 1 ? "s" : ""}</p>
      )}

      {/* ── Projects Grid ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-1">No projects yet</h3>
          <p className="text-sm text-zinc-500 mb-6">Create your first project and start managing inventory</p>
          <Button onClick={openCreateModal} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => {
            const sc = statusConfig[project.status] || statusConfig.completed
            return (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="text-left bg-white rounded-3xl border border-zinc-200 p-6 hover:shadow-lg hover:border-zinc-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-medium">
                    {project.project_type}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {getStatusLabel(project.status)}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-zinc-900 mb-1 group-hover:text-zinc-700 transition-colors">
                  {project.name}
                </h3>

                {(project.city || project.state) && (
                  <p className="text-sm text-zinc-500 flex items-center gap-1.5 mb-3">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {[project.city, project.state].filter(Boolean).join(", ")}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    {project.rera_number && (
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        RERA
                      </span>
                    )}
                    {project.description && (
                      <span className="truncate max-w-[160px]">{project.description}</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {meta.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" className="rounded-full" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-zinc-500">
            Page {page} of {meta.pages}
          </span>
          <Button variant="outline" className="rounded-full" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* ═══════════ Create Project Modal ═══════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 shadow-2xl">
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              {/* ── Left Panel ── */}
              <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white p-7 md:p-8 md:rounded-l-3xl">
                <div className="flex items-center gap-2 text-zinc-400 mb-4">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">New Project</span>
                </div>
                <h3 className="text-2xl font-bold leading-tight mb-2">
                  Set up your project in a guided flow
                </h3>
                <p className="text-zinc-400 text-sm">
                  Configure project details, location, compliance, and auto-generate your inventory — all in one go.
                </p>

                {/* Progress */}
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    {["Basics", "Location", "Compliance", "Inventory"].map((label, i) => {
                      const s = i + 1
                      const done = step > s
                      const active = step === s
                      return (
                        <div key={label} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              done
                                ? "bg-emerald-500 text-white"
                                : active
                                ? "bg-white text-zinc-900"
                                : "bg-white/10 text-zinc-500"
                            }`}
                          >
                            {done ? "✓" : s}
                          </div>
                          <span className={`text-[10px] ${active ? "text-white" : "text-zinc-500"}`}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                  {projectDraft.name && (
                    <div className="border-t border-white/10 pt-3 mt-2 space-y-1 text-xs text-zinc-400">
                      <p><span className="text-zinc-500">Project:</span> <span className="text-white">{projectDraft.name}</span></p>
                      {projectDraft.city && (
                        <p><span className="text-zinc-500">Location:</span> <span className="text-zinc-300">{[projectDraft.city, projectDraft.state].filter(Boolean).join(", ")}</span></p>
                      )}
                      {step >= 4 && (
                        <p><span className="text-zinc-500">Inventory:</span> <span className="text-zinc-300">{inventorySummary.towers} tower(s), {inventorySummary.autoUnits} flat(s)</span></p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2 text-sm text-zinc-400">
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Better data quality from day one</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Auto-generate inventory (flats)</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Consistent setup across projects</p>
                </div>
              </div>

              {/* ── Right Panel ── */}
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {step === 1 && "Project Basics"}
                      {step === 2 && "Location Details"}
                      {step === 3 && "Compliance & Review"}
                      {step === 4 && "Inventory Setup"}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-0.5">Step {step} of 4</p>
                  </div>
                  <button onClick={closeCreateModal} className="p-2 rounded-full hover:bg-zinc-100 transition-colors">
                    <X className="h-5 w-5 text-zinc-500" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Step 1 */}
                  {step === 1 && (
                    <>
                      <div className="space-y-2">
                        <Label>Project Name *</Label>
                        <Input className="rounded-xl" value={projectDraft.name} onChange={(e) => setProjectDraft({ ...projectDraft, name: e.target.value })} placeholder="e.g., Skyline Residency" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={projectDraft.project_type} onValueChange={(v) => setProjectDraft({ ...projectDraft, project_type: v })}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{projectTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={projectDraft.status} onValueChange={(v) => setProjectDraft({ ...projectDraft, status: v })}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{projectStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <textarea
                          className="w-full min-h-[80px] rounded-xl border border-zinc-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 resize-none"
                          value={projectDraft.description} onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })}
                          placeholder="Short summary for your internal team"
                        />
                      </div>
                    </>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>City</Label><Input className="rounded-xl" value={projectDraft.city} onChange={(e) => setProjectDraft({ ...projectDraft, city: e.target.value })} placeholder="e.g., Mumbai" /></div>
                        <div className="space-y-2"><Label>State</Label><Input className="rounded-xl" value={projectDraft.state} onChange={(e) => setProjectDraft({ ...projectDraft, state: e.target.value })} placeholder="e.g., Maharashtra" /></div>
                      </div>
                      <div className="space-y-2"><Label>Address</Label><Input className="rounded-xl" value={projectDraft.address} onChange={(e) => setProjectDraft({ ...projectDraft, address: e.target.value })} placeholder="Street, area, landmark" /></div>
                    </>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <>
                      <div className="space-y-2"><Label>RERA Number</Label><Input className="rounded-xl" value={projectDraft.rera_number} onChange={(e) => setProjectDraft({ ...projectDraft, rera_number: e.target.value })} placeholder="Optional compliance identifier" /></div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm space-y-2">
                        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-medium mb-2">Summary</p>
                        <p><span className="text-zinc-500">Project:</span> {projectDraft.name || "—"}</p>
                        <p><span className="text-zinc-500">Type:</span> {projectTypes.find((t) => t.value === projectDraft.project_type)?.label || "—"}</p>
                        <p><span className="text-zinc-500">Status:</span> {getStatusLabel(projectDraft.status)}</p>
                        <p><span className="text-zinc-500">Location:</span> {[projectDraft.city, projectDraft.state].filter(Boolean).join(", ") || "—"}</p>
                        {projectDraft.rera_number && <p><span className="text-zinc-500">RERA:</span> {projectDraft.rera_number}</p>}
                      </div>
                    </>
                  )}

                  {/* Step 4 */}
                  {step === 4 && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-xs text-zinc-500">Towers Planned</p>
                          <p className="text-2xl font-semibold text-zinc-900 mt-1">{inventorySummary.towers}</p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-xs text-zinc-500">Flats to Auto-Create</p>
                          <p className="text-2xl font-semibold text-zinc-900 mt-1">{inventorySummary.autoUnits}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-600">Configure towers and auto-generate flats.</p>
                        <div className="flex gap-2">
                          {towerPlans.length > 1 && (
                            <Button type="button" size="sm" variant="outline" className="rounded-full text-xs" onClick={cloneDefaultsToAllTowers}>Apply Defaults</Button>
                          )}
                          <Button type="button" size="sm" variant="outline" className="rounded-full text-xs" onClick={addTowerPlanRow}>
                            <Plus className="h-3 w-3 mr-1" />Add Tower
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {towerPlans.map((plan, idx) => (
                          <div key={plan.id} className="rounded-2xl border border-zinc-200 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm text-zinc-900">Tower Setup {idx + 1}</p>
                              {towerPlans.length > 1 && (
                                <button type="button" onClick={() => removeTowerPlanRow(plan.id)} className="text-xs text-red-500 hover:text-red-600">Remove</button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1"><Label className="text-xs">Tower Name</Label><Input className="rounded-lg text-sm" value={plan.name} onChange={(e) => updateTowerPlan(plan.id, { name: e.target.value })} placeholder="Tower 1" /></div>
                              <div className="space-y-1"><Label className="text-xs">Tower Code</Label><Input className="rounded-lg text-sm" value={plan.code} onChange={(e) => updateTowerPlan(plan.id, { code: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })} placeholder="01" /></div>
                              <div className="space-y-1"><Label className="text-xs">Floors</Label><Input className="rounded-lg text-sm" type="number" min={1} value={plan.floors_count} onChange={(e) => updateTowerPlan(plan.id, { floors_count: Number(e.target.value || 0) })} /></div>
                              <div className="space-y-1"><Label className="text-xs">Flats/Floor</Label><Input className="rounded-lg text-sm" type="number" min={1} value={plan.flats_per_floor} onChange={(e) => updateTowerPlan(plan.id, { flats_per_floor: Number(e.target.value || 0) })} /></div>
                            </div>

                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" className="rounded" checked={plan.auto_create_flats} onChange={(e) => updateTowerPlan(plan.id, { auto_create_flats: e.target.checked })} />
                              Auto-create flats for this tower
                            </label>

                            {plan.auto_create_flats && (
                              <>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Unit Type</Label>
                                    <Select value={plan.unit_type} onValueChange={(v) => updateTowerPlan(plan.id, { unit_type: v })}>
                                      <SelectTrigger className="rounded-lg text-sm h-9"><SelectValue /></SelectTrigger>
                                      <SelectContent>{unitTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1"><Label className="text-xs">Area (sqft)</Label><Input className="rounded-lg text-sm" type="number" min={1} value={plan.super_built_up_area} onChange={(e) => updateTowerPlan(plan.id, { super_built_up_area: Number(e.target.value || 0) })} /></div>
                                  <div className="space-y-1"><Label className="text-xs">Base Price</Label><Input className="rounded-lg text-sm" type="number" min={1} value={plan.base_price} onChange={(e) => updateTowerPlan(plan.id, { base_price: Number(e.target.value || 0) })} /></div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Facing</Label>
                                  <Select value={plan.facing} onValueChange={(v) => updateTowerPlan(plan.id, { facing: v })}>
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
                                  <p>Preview: <span className="font-medium text-zinc-700">{getTowerNumberPreview(plan).first}</span> → <span className="font-medium text-zinc-700">{getTowerNumberPreview(plan).last}</span></p>
                                  <p>{Math.max(0, plan.floors_count) * Math.max(0, plan.flats_per_floor)} flats will be created</p>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Nav Buttons */}
                  <div className="flex justify-between gap-2 pt-4 border-t border-zinc-100">
                    <Button type="button" variant="outline" className="rounded-full" onClick={closeCreateModal}>Cancel</Button>
                    <div className="flex gap-2">
                      {step > 1 && <Button type="button" variant="outline" className="rounded-full" onClick={() => setStep((s) => s - 1)}>Back</Button>}
                      {step < 4 ? (
                        <Button
                          type="button"
                          className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
                          onClick={() => {
                            if (step === 1 && !projectDraft.name.trim()) { toast({ variant: "destructive", title: "Project name is required" }); return }
                            setStep((s) => s + 1)
                          }}
                        >
                          Continue<ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button type="button" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                          {createProjectMutation.isPending ? (<><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />Creating…</>) : "Create Project & Inventory"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
