import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { projectsApi, inventoryApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Building2, MapPin, Plus, Settings2, Wand2, PencilLine, Trash2 } from "lucide-react"

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
  super_built_up_area?: number
  total_price?: number
  status: string
}

const projectStatuses = [
  { value: "pre_launch", label: "Pre-launch" },
  { value: "launch", label: "Launch" },
  { value: "under_construction", label: "Under Construction" },
  { value: "ready_to_move", label: "Ready to Move" },
  { value: "completed", label: "Completed" },
]

const unitStatusOptions = ["available", "blocked", "booked", "sold", "registered"]

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null)
  const [showAddTowerModal, setShowAddTowerModal] = useState(false)
  const [showTowerToolsModal, setShowTowerToolsModal] = useState(false)
  const [showAddFlatModal, setShowAddFlatModal] = useState(false)

  const [unitSearch, setUnitSearch] = useState("")
  const [unitStatusFilter, setUnitStatusFilter] = useState("all")

  const [editProjectData, setEditProjectData] = useState({
    name: "",
    status: "pre_launch",
    city: "",
    state: "",
    address: "",
    rera_number: "",
    description: "",
  })

  const [towerFormData, setTowerFormData] = useState({ name: "", floors_count: 10 })

  const [generateData, setGenerateData] = useState({
    code: "01",
    floors_count: 10,
    flats_per_floor: 4,
    unit_type: "2bhk",
    super_built_up_area: 1200,
    base_price: 6500,
    facing: "north",
  })

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId).then((res) => res.data as Project),
    enabled: Number.isFinite(projectId) && projectId > 0,
  })

  const { data: towersResponse } = useQuery({
    queryKey: ["project-towers", projectId],
    queryFn: () => inventoryApi.listTowers(projectId).then((res) => res.data),
    enabled: Number.isFinite(projectId) && projectId > 0,
  })

  const { data: unitsResponse } = useQuery({
    queryKey: ["project-units-all", projectId],
    queryFn: () => inventoryApi.listUnits({ project_id: projectId, per_page: 1000 }).then((res) => res.data),
    enabled: Number.isFinite(projectId) && projectId > 0,
  })

  const towers: Tower[] = towersResponse?.data || []
  const allUnits: Unit[] = unitsResponse?.data || []

  const selectedTower = useMemo(
    () => towers.find((tower) => tower.id === selectedTowerId) || null,
    [towers, selectedTowerId]
  )

  useEffect(() => {
    if (project) {
      setEditProjectData({
        name: project.name || "",
        status: project.status || "pre_launch",
        city: project.city || "",
        state: project.state || "",
        address: project.address || "",
        rera_number: project.rera_number || "",
        description: project.description || "",
      })
    }
  }, [project])

  useEffect(() => {
    if (towers.length === 0) {
      setSelectedTowerId(null)
      return
    }
    if (!selectedTowerId || !towers.some((tower) => tower.id === selectedTowerId)) {
      const towerWithUnits = towers.find((tower) => allUnits.some((unit) => unit.tower_id === tower.id))
      setSelectedTowerId(towerWithUnits?.id || towers[0].id)
    }
  }, [towers, allUnits, selectedTowerId])

  useEffect(() => {
    setUnitSearch("")
    setUnitStatusFilter("all")
  }, [selectedTowerId])

  const unitsByTower = useMemo(() => {
    const map = new Map<number, Unit[]>()
    for (const unit of allUnits) {
      if (!map.has(unit.tower_id)) map.set(unit.tower_id, [])
      map.get(unit.tower_id)!.push(unit)
    }
    return map
  }, [allUnits])

  const currentTowerUnits = useMemo(() => {
    if (!selectedTowerId) return []
    return unitsByTower.get(selectedTowerId) || []
  }, [selectedTowerId, unitsByTower])

  const filteredUnits = useMemo(
    () =>
      currentTowerUnits.filter((unit) => {
        const matchesSearch =
          !unitSearch.trim() ||
          unit.unit_number.toLowerCase().includes(unitSearch.toLowerCase()) ||
          unit.unit_type.toLowerCase().includes(unitSearch.toLowerCase())
        const matchesStatus = unitStatusFilter === "all" || unit.status === unitStatusFilter
        return matchesSearch && matchesStatus
      }),
    [currentTowerUnits, unitSearch, unitStatusFilter]
  )

  const towerStats = useMemo(() => {
    const getForUnits = (units: Unit[]) => ({
      total: units.length,
      available: units.filter((u) => u.status === "available").length,
      blocked: units.filter((u) => u.status === "blocked").length,
      booked: units.filter((u) => u.status === "booked").length,
      sold: units.filter((u) => u.status === "sold" || u.status === "registered").length,
    })

    return {
      overall: getForUnits(allUnits),
      selected: getForUnits(currentTowerUnits),
    }
  }, [allUnits, currentTowerUnits])

  const updateProjectMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.update(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      toast({ title: "Project details updated" })
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
    mutationFn: ({ towerId, payload }: { towerId: number; payload: { name: string; floors_count: number } }) =>
      inventoryApi.updateTower(towerId, payload),
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
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete tower",
        description: error?.response?.data?.detail || "Delete units first",
      })
    },
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
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["project-units-all", projectId] })
      setShowTowerToolsModal(false)
      toast({ title: "Flats generated", description: `${vars.unitsPayload.length} flats created` })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to generate flats", description: error?.response?.data?.detail || "Please try again" })
    },
  })

  const updateUnitStatusMutation = useMutation({
    mutationFn: ({ unitId, status }: { unitId: number; status: string }) => inventoryApi.updateUnit(unitId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-units-all", projectId] })
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update flat status" }),
  })

  const openTowerTools = () => {
    if (!selectedTower) {
      toast({ variant: "destructive", title: "Select a tower first" })
      return
    }
    const codeFromName = selectedTower.name.replace(/[^0-9]/g, "").slice(-2) || "01"
    setTowerFormData({ name: selectedTower.name, floors_count: selectedTower.floors_count })
    setGenerateData((prev) => ({
      ...prev,
      code: codeFromName.padStart(2, "0"),
      floors_count: selectedTower.floors_count || 10,
    }))
    setShowTowerToolsModal(true)
  }

  const buildAutoUnitsPayload = () => {
    const code = (generateData.code || "01").toUpperCase()
    const existing = new Set(currentTowerUnits.map((u) => u.unit_number))
    const unitsPayload: any[] = []

    for (let floor = 1; floor <= generateData.floors_count; floor += 1) {
      for (let flat = 1; flat <= generateData.flats_per_floor; flat += 1) {
        const unitNumber = `${code}-${String(floor).padStart(2, "0")}${flat}`
        if (existing.has(unitNumber)) continue
        unitsPayload.push({
          floor,
          unit_number: unitNumber,
          unit_type: generateData.unit_type,
          super_built_up_area: generateData.super_built_up_area,
          base_price: generateData.base_price,
          facing: generateData.facing,
          status: "available",
        })
      }
    }

    return unitsPayload
  }

  const handleGenerateFlats = () => {
    if (!selectedTower) return
    if (generateData.floors_count < 1 || generateData.flats_per_floor < 1) {
      toast({ variant: "destructive", title: "Floors and flats/floor must be at least 1" })
      return
    }
    const payload = buildAutoUnitsPayload()
    if (payload.length === 0) {
      toast({ title: "No new flats to create", description: "All generated numbers already exist for this tower" })
      return
    }
    generateFlatsMutation.mutate({ towerId: selectedTower.id, unitsPayload: payload })
  }

  const getStatusClass = (status: string) => {
    if (status === "available") return "bg-emerald-100 text-emerald-900 border-emerald-300"
    if (status === "blocked") return "bg-amber-100 text-amber-900 border-amber-300"
    if (status === "booked") return "bg-sky-100 text-sky-900 border-sky-300"
    if (status === "sold" || status === "registered") return "bg-rose-100 text-rose-900 border-rose-300"
    return "bg-zinc-100 text-zinc-800 border-zinc-300"
  }

  if (!Number.isFinite(projectId) || projectId <= 0) {
    return <div className="text-sm text-red-600">Invalid project id</div>
  }

  if (projectLoading || !project) {
    return <div className="text-center py-12">Loading project details...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-500">
              <Building2 className="h-4 w-4" />
              <span className="capitalize">{project.project_type}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">{project.name}</h1>
            <p className="text-zinc-500 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {[project.city, project.state].filter(Boolean).join(", ") || "Location not set"}
            </p>
            <Badge className="bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200">
              {projectStatuses.find((s) => s.value === project.status)?.label || project.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200"><p className="text-xs uppercase tracking-wider text-zinc-500">Total Flats</p><p className="text-2xl font-semibold text-zinc-900 mt-1">{towerStats.overall.total}</p></div>
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200"><p className="text-xs uppercase tracking-wider text-emerald-600">Available</p><p className="text-2xl font-semibold text-zinc-900 mt-1">{towerStats.overall.available}</p></div>
            <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200"><p className="text-xs uppercase tracking-wider text-sky-600">Booked</p><p className="text-2xl font-semibold text-zinc-900 mt-1">{towerStats.overall.booked}</p></div>
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200"><p className="text-xs uppercase tracking-wider text-rose-600">Sold</p><p className="text-2xl font-semibold text-zinc-900 mt-1">{towerStats.overall.sold}</p></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-900">Towers</h3>
              <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => setShowAddTowerModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Tower
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {towers.map((tower) => {
                const isSelected = tower.id === selectedTowerId
                const unitCount = (unitsByTower.get(tower.id) || []).length
                return (
                  <button
                    key={tower.id}
                    onClick={() => setSelectedTowerId(tower.id)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      isSelected ? "border-black bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold">Tower {tower.name}</p>
                      <span className={`text-xs ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                        {tower.floors_count} floors | {unitCount} flats
                      </span>
                    </div>
                    <div className="h-24 rounded-lg p-2 bg-gradient-to-b from-zinc-800 to-zinc-950 grid grid-cols-4 gap-1">
                      {Array.from({ length: Math.min(tower.floors_count * 2, 24) }).map((_, idx) => (
                        <span key={idx} className="rounded-sm bg-amber-200/80 h-2.5" />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
            {towers.length === 0 && <p className="text-sm text-zinc-500">No towers found for this project.</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="text-lg font-semibold text-zinc-900">Selected Tower Snapshot</h3>
          </div>
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 p-3"><p className="text-xs text-zinc-500">Total</p><p className="text-xl font-semibold">{towerStats.selected.total}</p></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs text-emerald-600">Available</p><p className="text-xl font-semibold text-emerald-700">{towerStats.selected.available}</p></div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3"><p className="text-xs text-sky-600">Booked</p><p className="text-xl font-semibold text-sky-700">{towerStats.selected.booked}</p></div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs text-rose-600">Sold</p><p className="text-xl font-semibold text-rose-700">{towerStats.selected.sold}</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Flat Availability</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Tower {selectedTower?.name || "-"}</Badge>
            <Button size="sm" variant="outline" className="rounded-full" onClick={openTowerTools} disabled={!selectedTowerId}>
              <Settings2 className="h-4 w-4 mr-1" />
              Tower Tools
            </Button>
            <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => setShowAddFlatModal(true)} disabled={!selectedTowerId}>
              Add Flat
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <Input placeholder="Search flat no. or type..." value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} />
            <Select value={unitStatusFilter} onValueChange={setUnitStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {unitStatusOptions.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="rounded-md border px-3 py-2 text-sm text-zinc-600">Showing {filteredUnits.length} of {currentTowerUnits.length} flats</div>
          </div>

          {currentTowerUnits.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">No flats in this tower yet. Use Add Flat or Tower Tools to generate flats.</p>
              {towers.some((tower) => (unitsByTower.get(tower.id) || []).length > 0) && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-zinc-500 mb-2">Other towers with flats:</p>
                  <div className="flex flex-wrap gap-2">
                    {towers
                      .filter((tower) => (unitsByTower.get(tower.id) || []).length > 0 && tower.id !== selectedTowerId)
                      .map((tower) => (
                        <Button key={tower.id} size="sm" variant="outline" onClick={() => setSelectedTowerId(tower.id)}>
                          Tower {tower.name} ({(unitsByTower.get(tower.id) || []).length})
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-sm text-zinc-500 flex items-center justify-between rounded-lg border p-3">
              <span>No flats match your current search/filter.</span>
              <Button variant="outline" size="sm" onClick={() => { setUnitSearch(""); setUnitStatusFilter("all") }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUnits.map((unit) => (
                <div key={unit.id} className={`rounded-xl border p-4 ${getStatusClass(unit.status)}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Flat {unit.unit_number}</p>
                    <Badge className="capitalize bg-white/70 text-zinc-900 border border-zinc-300">{unit.status}</Badge>
                  </div>
                  <p className="text-xs mt-1 capitalize">{unit.unit_type} | Floor {unit.floor}</p>
                  <p className="text-xs mt-1">{unit.super_built_up_area || "-"} sqft</p>
                  <div className="mt-3">
                    <Label className="text-xs">Edit Status</Label>
                    <Select value={unit.status} onValueChange={(nextStatus) => updateUnitStatusMutation.mutate({ unitId: unit.id, status: nextStatus })}>
                      <SelectTrigger className="mt-1 h-8 bg-white/80"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {unitStatusOptions.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
          <PencilLine className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-zinc-900">Edit Project Details</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Project Name</Label><Input value={editProjectData.name} onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editProjectData.status} onValueChange={(value) => setEditProjectData({ ...editProjectData, status: value })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {projectStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>City</Label><Input value={editProjectData.city} onChange={(e) => setEditProjectData({ ...editProjectData, city: e.target.value })} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={editProjectData.state} onChange={(e) => setEditProjectData({ ...editProjectData, state: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Input value={editProjectData.address} onChange={(e) => setEditProjectData({ ...editProjectData, address: e.target.value })} /></div>
          <div className="space-y-2"><Label>RERA Number</Label><Input value={editProjectData.rera_number} onChange={(e) => setEditProjectData({ ...editProjectData, rera_number: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full min-h-[96px] rounded-md border border-zinc-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              value={editProjectData.description}
              onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => updateProjectMutation.mutate(editProjectData)} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {showAddTowerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Add Tower</CardTitle></CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  addTowerMutation.mutate({
                    project_id: projectId,
                    name: towerFormData.name.trim(),
                    floors_count: towerFormData.floors_count,
                  })
                }}
                className="space-y-4"
              >
                <div className="space-y-2"><Label>Tower Name</Label><Input value={towerFormData.name} onChange={(e) => setTowerFormData({ ...towerFormData, name: e.target.value })} placeholder="A" required /></div>
                <div className="space-y-2"><Label>Floors Count</Label><Input type="number" min={1} value={towerFormData.floors_count} onChange={(e) => setTowerFormData({ ...towerFormData, floors_count: Number(e.target.value || 0) })} required /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddTowerModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={addTowerMutation.isPending}>{addTowerMutation.isPending ? "Adding..." : "Add Tower"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showAddFlatModal && selectedTower && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Add Flat - Tower {selectedTower.name}</CardTitle></CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  addFlatMutation.mutate({
                    tower_id: selectedTower.id,
                    floor: Number(formData.get("floor") || 0),
                    unit_number: String(formData.get("unit_number") || "").trim(),
                    unit_type: String(formData.get("unit_type") || "2bhk"),
                    super_built_up_area: Number(formData.get("super_built_up_area") || 0),
                    base_price: Number(formData.get("base_price") || 0),
                    facing: String(formData.get("facing") || "north"),
                  })
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Floor</Label><Input name="floor" type="number" min={1} required /></div>
                  <div className="space-y-2"><Label>Flat Number</Label><Input name="unit_number" placeholder="01-001" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Unit Type</Label><Input name="unit_type" defaultValue="2bhk" required /></div>
                  <div className="space-y-2"><Label>Facing</Label><Input name="facing" defaultValue="north" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Area (sqft)</Label><Input name="super_built_up_area" type="number" min={1} required /></div>
                  <div className="space-y-2"><Label>Base Price</Label><Input name="base_price" type="number" min={1} required /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddFlatModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={addFlatMutation.isPending}>{addFlatMutation.isPending ? "Adding..." : "Add Flat"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showTowerToolsModal && selectedTower && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl">
            <CardHeader><CardTitle>Tower Tools - {selectedTower.name}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-medium">Edit Tower</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Tower Name</Label><Input value={towerFormData.name} onChange={(e) => setTowerFormData({ ...towerFormData, name: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Floors</Label><Input type="number" min={1} value={towerFormData.floors_count} onChange={(e) => setTowerFormData({ ...towerFormData, floors_count: Number(e.target.value || 0) })} /></div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateTowerMutation.mutate({
                        towerId: selectedTower.id,
                        payload: { name: towerFormData.name.trim(), floors_count: towerFormData.floors_count },
                      })
                    }
                    disabled={updateTowerMutation.isPending}
                  >
                    {updateTowerMutation.isPending ? "Saving..." : "Save Tower"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2"><Wand2 className="h-4 w-4" /><p className="font-medium">Auto-Generate Flats</p></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>Tower Code</Label><Input value={generateData.code} onChange={(e) => setGenerateData({ ...generateData, code: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })} placeholder="01" /></div>
                  <div className="space-y-1"><Label>Floors</Label><Input type="number" min={1} value={generateData.floors_count} onChange={(e) => setGenerateData({ ...generateData, floors_count: Number(e.target.value || 0) })} /></div>
                  <div className="space-y-1"><Label>Flats/Floor</Label><Input type="number" min={1} value={generateData.flats_per_floor} onChange={(e) => setGenerateData({ ...generateData, flats_per_floor: Number(e.target.value || 0) })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>Unit Type</Label><Input value={generateData.unit_type} onChange={(e) => setGenerateData({ ...generateData, unit_type: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Area (sqft)</Label><Input type="number" min={1} value={generateData.super_built_up_area} onChange={(e) => setGenerateData({ ...generateData, super_built_up_area: Number(e.target.value || 0) })} /></div>
                  <div className="space-y-1"><Label>Base Price</Label><Input type="number" min={1} value={generateData.base_price} onChange={(e) => setGenerateData({ ...generateData, base_price: Number(e.target.value || 0) })} /></div>
                </div>
                <div className="space-y-1"><Label>Facing</Label><Input value={generateData.facing} onChange={(e) => setGenerateData({ ...generateData, facing: e.target.value })} /></div>
                <p className="text-xs text-zinc-500">
                  Preview: {(generateData.code || "01").toUpperCase()}-001 to {(generateData.code || "01").toUpperCase()}-{String(Math.max(1, generateData.floors_count)).padStart(2, "0")}
                  {Math.max(1, generateData.flats_per_floor)}
                </p>
                <p className="text-xs text-zinc-500">
                  Will attempt {Math.max(0, generateData.floors_count) * Math.max(0, generateData.flats_per_floor)} flats. Existing flat numbers are skipped.
                </p>
                <div className="flex justify-end">
                  <Button onClick={handleGenerateFlats} disabled={generateFlatsMutation.isPending}>
                    {generateFlatsMutation.isPending ? "Generating..." : "Generate Flats"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="font-medium text-red-700">Danger Zone</p>
                <p className="text-sm text-red-700">Delete tower only when no flats are linked.</p>
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={() => deleteTowerMutation.mutate(selectedTower.id)} disabled={deleteTowerMutation.isPending}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deleteTowerMutation.isPending ? "Deleting..." : "Delete Tower"}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end"><Button variant="outline" onClick={() => setShowTowerToolsModal(false)}>Close</Button></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
