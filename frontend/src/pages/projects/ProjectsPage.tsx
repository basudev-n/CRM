import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
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
import { projectsApi, inventoryApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Search, Building, MapPin, X, Layers, Upload, Download, Grid3X3, Sparkles, CheckCircle2 } from "lucide-react"

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
  master_plan?: string
  brochure?: string
  gallery?: string
  created_at: string
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
  base_price: number
  total_price?: number
  status: string
}

interface FloorSummary {
  tower_id: number
  floor: number
  total: number
  available: number
  blocked: number
  booked: number
  sold: number
  registered: number
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

const unitStatuses = [
  { value: "available", label: "Available", color: "bg-green-100 text-green-700" },
  { value: "blocked", label: "Blocked", color: "bg-yellow-100 text-yellow-700" },
  { value: "booked", label: "Booked", color: "bg-blue-100 text-blue-700" },
  { value: "sold", label: "Sold", color: "bg-red-100 text-red-700" },
]

export default function ProjectsPage() {
  const navigate = useNavigate()
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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectOnboardingStep, setProjectOnboardingStep] = useState(1)
  const [projectDraft, setProjectDraft] = useState(initialProjectDraft)
  const [towerPlans, setTowerPlans] = useState<TowerPlan[]>([createInitialTowerPlan(1)])
  const [showTowerModal, setShowTowerModal] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [importingUnits, setImportingUnits] = useState(false)
  const [uploadingMediaType, setUploadingMediaType] = useState<"master_plan" | "brochure" | "gallery" | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const inventorySummary = useMemo(() => {
    const towers = towerPlans.filter((plan) => plan.name.trim())
    const autoUnits = towers.reduce((acc, plan) => {
      if (!plan.auto_create_flats) return acc
      return acc + Math.max(0, plan.floors_count) * Math.max(0, plan.flats_per_floor)
    }, 0)
    return { towers: towers.length, autoUnits }
  }, [towerPlans])

  const { data, isLoading } = useQuery({
    queryKey: ["projects", page, search, statusFilter],
    queryFn: () =>
      projectsApi
        .list({
          page,
          per_page: 10,
          search: search || undefined,
          status: statusFilter || undefined,
        })
        .then((res) => res.data),
  })

  const { data: towersData } = useQuery({
    queryKey: ["towers", selectedProject?.id],
    queryFn: () =>
      selectedProject?.id
        ? inventoryApi.listTowers(selectedProject.id).then((res) => res.data)
        : Promise.resolve({ data: [] }),
    enabled: !!selectedProject?.id,
  })

  const { data: unitsData } = useQuery({
    queryKey: ["units", selectedTower?.id],
    queryFn: () =>
      selectedTower?.id
        ? inventoryApi.listUnits({ tower_id: selectedTower.id }).then((res) => res.data)
        : Promise.resolve({ data: [] }),
    enabled: !!selectedTower?.id,
  })

  const { data: floorSummaryData } = useQuery({
    queryKey: ["floor-summary", selectedProject?.id, selectedTower?.id],
    queryFn: () =>
      selectedProject?.id
        ? inventoryApi
            .floorSummary(selectedProject.id, selectedTower?.id)
            .then((res) => res.data)
        : Promise.resolve({ data: [] }),
    enabled: !!selectedProject?.id,
  })

  const createProjectMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create project" })
    },
  })

  const createTowerMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createTower(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["towers"] })
      setShowTowerModal(false)
      toast({ title: "Tower created successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create tower" })
    },
  })

  const createUnitMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] })
      setShowUnitModal(false)
      toast({ title: "Unit created successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create unit" })
    },
  })

  const uploadMediaMutation = useMutation({
    mutationFn: ({ projectId, mediaType, file }: { projectId: number; mediaType: "master_plan" | "brochure" | "gallery"; file: File }) =>
      projectsApi.uploadMedia(projectId, mediaType, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["projects", page, search, statusFilter] })
      toast({ title: "Media uploaded successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to upload media", description: error?.response?.data?.detail || "Please try again" })
    },
    onSettled: () => setUploadingMediaType(null),
  })

  const updateTowerPlan = (towerId: number, updates: Partial<TowerPlan>) => {
    setTowerPlans((prev) => prev.map((plan) => (plan.id === towerId ? { ...plan, ...updates } : plan)))
  }

  const addTowerPlanRow = () => {
    setTowerPlans((prev) => [...prev, createInitialTowerPlan(prev.length + 1)])
  }

  const removeTowerPlanRow = (towerId: number) => {
    setTowerPlans((prev) => prev.filter((plan) => plan.id !== towerId))
  }

  const buildAutoUnits = (plan: TowerPlan) => {
    const units: any[] = []
    for (let floor = 1; floor <= plan.floors_count; floor += 1) {
      for (let flat = 1; flat <= plan.flats_per_floor; flat += 1) {
        const floorPart = String(floor).padStart(2, "0")
        const flatPart = String(flat)
        units.push({
          floor,
          unit_number: `${plan.code}-${floorPart}${flatPart}`,
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
    const towerCode = (plan.code || "01").toUpperCase()
    const first = `${towerCode}-001`
    const lastFloor = String(Math.max(1, plan.floors_count)).padStart(2, "0")
    const lastFlat = String(Math.max(1, plan.flats_per_floor))
    const last = `${towerCode}-${lastFloor}${lastFlat}`
    return { first, last }
  }

  const validateTowerPlans = () => {
    const activePlans = towerPlans.filter((plan) => plan.name.trim())
    if (activePlans.length === 0) {
      toast({ variant: "destructive", title: "Add at least one tower" })
      return false
    }
    const duplicateCodes = new Set<string>()
    for (const plan of activePlans) {
      if (!plan.code.trim()) {
        toast({ variant: "destructive", title: `Tower code missing for ${plan.name}` })
        return false
      }
      if (duplicateCodes.has(plan.code.trim().toUpperCase())) {
        toast({ variant: "destructive", title: `Duplicate tower code: ${plan.code}` })
        return false
      }
      duplicateCodes.add(plan.code.trim().toUpperCase())
      if (plan.floors_count < 1) {
        toast({ variant: "destructive", title: `Floors must be at least 1 for ${plan.name}` })
        return false
      }
      if (plan.auto_create_flats && plan.flats_per_floor < 1) {
        toast({ variant: "destructive", title: `Flats per floor must be at least 1 for ${plan.name}` })
        return false
      }
    }
    return true
  }

  const cloneDefaultsToAllTowers = () => {
    const base = towerPlans[0]
    if (!base) return
    setTowerPlans((prev) =>
      prev.map((plan, idx) =>
        idx === 0
          ? plan
          : {
              ...plan,
              flats_per_floor: base.flats_per_floor,
              auto_create_flats: base.auto_create_flats,
              unit_type: base.unit_type,
              super_built_up_area: base.super_built_up_area,
              base_price: base.base_price,
              facing: base.facing,
            }
      )
    )
    toast({ title: "Applied Tower 1 inventory defaults to all towers" })
  }

  const handleCreateProject = async () => {
    if (!projectDraft.name.trim()) {
      toast({ variant: "destructive", title: "Project name is required" })
      setProjectOnboardingStep(1)
      return
    }
    if (!validateTowerPlans()) {
      setProjectOnboardingStep(4)
      return
    }
    try {
      const projectRes = await createProjectMutation.mutateAsync(projectDraft)
      const createdProject = projectRes.data

      let totalUnitsCreated = 0
      const activePlans = towerPlans.filter((plan) => plan.name.trim())

      for (const plan of activePlans) {
        const towerRes = await inventoryApi.createTower({
          project_id: createdProject.id,
          name: plan.name.trim(),
          floors_count: Number(plan.floors_count) || 0,
        })
        const createdTowerId = towerRes.data.id

        if (plan.auto_create_flats && plan.floors_count > 0 && plan.flats_per_floor > 0) {
          const units = buildAutoUnits(plan)
          await inventoryApi.bulkCreateUnits(createdTowerId, units)
          totalUnitsCreated += units.length
        }
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setProjectDraft(initialProjectDraft)
      setTowerPlans([createInitialTowerPlan(1)])
      setProjectOnboardingStep(1)
      setShowCreateModal(false)
      toast({
        title: "Project created successfully",
        description: `Towers: ${activePlans.length}, Flats auto-created: ${totalUnitsCreated}`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create project setup",
        description: error?.response?.data?.detail || "Please review tower/flat setup and try again",
      })
    }
  }

  const openCreateModal = () => {
    setProjectDraft(initialProjectDraft)
    setTowerPlans([createInitialTowerPlan(1)])
    setProjectOnboardingStep(1)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setTowerPlans([createInitialTowerPlan(1)])
    setProjectOnboardingStep(1)
    setShowCreateModal(false)
  }

  const handleCreateTower = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedProject) return
    const formData = new FormData(e.currentTarget)
    const data = {
      project_id: selectedProject.id,
      name: formData.get("name"),
      floors_count: Number(formData.get("floors_count")),
    }
    createTowerMutation.mutate(data)
  }

  const handleCreateUnit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedTower) return
    const formData = new FormData(e.currentTarget)
    const data = {
      tower_id: selectedTower.id,
      floor: Number(formData.get("floor")),
      unit_number: formData.get("unit_number"),
      unit_type: formData.get("unit_type"),
      super_built_up_area: Number(formData.get("super_built_up_area")),
      base_price: Number(formData.get("base_price")),
      facing: formData.get("facing") || "north",
    }
    createUnitMutation.mutate(data)
  }

  const handleMediaUpload = async (mediaType: "master_plan" | "brochure" | "gallery", file?: File | null) => {
    if (!selectedProject || !file) return
    setUploadingMediaType(mediaType)
    uploadMediaMutation.mutate({ projectId: selectedProject.id, mediaType, file })
  }

  const handleUnitImport = async (file?: File | null) => {
    if (!selectedTower || !file) return
    setImportingUnits(true)
    try {
      const response = await inventoryApi.importUnits(selectedTower.id, file)
      const result = response.data
      queryClient.invalidateQueries({ queryKey: ["units", selectedTower.id] })
      queryClient.invalidateQueries({ queryKey: ["floor-summary", selectedProject?.id, selectedTower?.id] })
      toast({
        title: "Units import completed",
        description: `Created: ${result.created}, Skipped: ${result.skipped}`,
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Import failed", description: error?.response?.data?.detail || "Please check file format" })
    } finally {
      setImportingUnits(false)
    }
  }

  const handlePriceListDownload = async () => {
    if (!selectedProject) return
    try {
      const response = await inventoryApi.downloadPriceList(selectedProject.id, selectedTower?.id)
      const blob = new Blob([response.data], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${selectedProject.name.replace(/\s+/g, "_").toLowerCase()}_price_list.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast({ variant: "destructive", title: "Failed to download price list" })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pre_launch": return "bg-purple-100 text-purple-700"
      case "launch": return "bg-blue-100 text-blue-700"
      case "under_construction": return "bg-yellow-100 text-yellow-700"
      case "ready_to_move": return "bg-green-100 text-green-700"
      case "completed": return "bg-zinc-100 text-zinc-700"
      default: return "bg-zinc-100 text-zinc-700"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
  }

  const getUnitStatusColor = (status: string) => {
    if (status === "available") return "bg-emerald-100 border-emerald-300 text-emerald-800"
    if (status === "blocked") return "bg-amber-100 border-amber-300 text-amber-800"
    if (status === "booked") return "bg-sky-100 border-sky-300 text-sky-800"
    if (status === "sold" || status === "registered") return "bg-rose-100 border-rose-300 text-rose-800"
    return "bg-zinc-100 border-zinc-300 text-zinc-700"
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Your <span className="font-semibold">Projects</span>
          </h1>
          <p className="text-zinc-500 mt-2">Manage your real estate projects and inventory</p>
        </div>
        <Button onClick={openCreateModal} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((project: Project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge className={getStatusColor(project.status)}>
                    {projectStatuses.find(s => s.value === project.status)?.label || project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="capitalize">{project.project_type}</span>
                  </div>
                  {project.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{project.city}, {project.state}</span>
                    </div>
                  )}
                  {project.rera_number && (
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      <span>RERA: {project.rera_number}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedProject.name}</CardTitle>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedProject.city}, {selectedProject.state}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(null); setSelectedTower(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Media Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Project Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Upload className="h-4 w-4" />
                        Upload Master Plan
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">PDF/Image, max 15MB</p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleMediaUpload("master_plan", e.target.files?.[0])}
                      />
                    </label>
                    <label className="border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Upload className="h-4 w-4" />
                        Upload Brochure
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">PDF only, max 15MB</p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={(e) => handleMediaUpload("brochure", e.target.files?.[0])}
                      />
                    </label>
                    <label className="border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Upload className="h-4 w-4" />
                        Upload Gallery Image
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">JPG/PNG/WebP, max 15MB</p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleMediaUpload("gallery", e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  {uploadingMediaType && (
                    <p className="text-xs text-zinc-500 mt-2">Uploading {uploadingMediaType.replace("_", " ")}...</p>
                  )}
                </div>

                {/* Towers Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Towers</h3>
                    <Button size="sm" onClick={() => setShowTowerModal(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Tower
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {towersData?.data?.map((tower: Tower) => (
                      <div
                        key={tower.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedTower?.id === tower.id ? 'border-primary bg-primary/5' : 'hover:border-zinc-300'
                        }`}
                        onClick={() => setSelectedTower(tower)}
                      >
                        <p className="font-medium">Tower {tower.name}</p>
                        <p className="text-sm text-zinc-500">{tower.floors_count} floors</p>
                      </div>
                    ))}
                    {towersData?.data?.length === 0 && (
                      <p className="text-sm text-zinc-500 col-span-4 text-center py-4">No towers yet</p>
                    )}
                  </div>
                </div>

                {/* Units Section */}
                {selectedTower && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Units - Tower {selectedTower.name}</h3>
                      <div className="flex gap-2">
                        <label className="inline-flex">
                          <input
                            type="file"
                            className="hidden"
                            accept=".csv,.xlsx"
                            onChange={(e) => handleUnitImport(e.target.files?.[0])}
                          />
                          <Button size="sm" variant="outline" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-1" />
                              {importingUnits ? "Importing..." : "Import Units"}
                            </span>
                          </Button>
                        </label>
                        <Button size="sm" variant="outline" onClick={handlePriceListDownload}>
                          <Download className="h-4 w-4 mr-1" /> Price List
                        </Button>
                        <Button size="sm" onClick={() => setShowUnitModal(true)}>
                          <Plus className="h-4 w-4 mr-1" /> Add Unit
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="p-2 text-left">Unit</th>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Floor</th>
                            <th className="p-2 text-left">Area</th>
                            <th className="p-2 text-left">Price</th>
                            <th className="p-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unitsData?.data?.map((unit: Unit) => (
                            <tr key={unit.id} className="border-t">
                              <td className="p-2">{unit.unit_number}</td>
                              <td className="p-2 capitalize">{unit.unit_type}</td>
                              <td className="p-2">{unit.floor}</td>
                              <td className="p-2">{unit.super_built_up_area} sqft</td>
                              <td className="p-2">{formatCurrency(unit.total_price || 0)}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  unitStatuses.find(s => s.value === unit.status)?.color || 'bg-zinc-100'
                                }`}>
                                  {unit.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {unitsData?.data?.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-zinc-500">No units yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Floor Grid */}
                {selectedTower && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Grid3X3 className="h-4 w-4" />
                      <h3 className="font-semibold text-lg">Inventory Grid (Color-coded)</h3>
                    </div>
                    <div className="space-y-2">
                      {(floorSummaryData?.data as FloorSummary[] | undefined)?.length ? (
                        (floorSummaryData?.data as FloorSummary[])
                          .sort((a, b) => b.floor - a.floor)
                          .map((f) => (
                            <div key={`${f.tower_id}-${f.floor}`} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium">Floor {f.floor}</p>
                                <p className="text-xs text-zinc-500">{f.total} units</p>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className={`px-2 py-1 rounded border ${getUnitStatusColor("available")}`}>Available: {f.available}</span>
                                <span className={`px-2 py-1 rounded border ${getUnitStatusColor("blocked")}`}>Blocked: {f.blocked}</span>
                                <span className={`px-2 py-1 rounded border ${getUnitStatusColor("booked")}`}>Booked: {f.booked}</span>
                                <span className={`px-2 py-1 rounded border ${getUnitStatusColor("sold")}`}>Sold/Registered: {f.sold + f.registered}</span>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-zinc-500">No floor summary available.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border-zinc-200">
            <div className="grid md:grid-cols-[0.95fr_1.05fr]">
              <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white p-6 md:p-7">
                <div className="flex items-center gap-2 text-zinc-300 mb-3">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">Add Project</span>
                </div>
                <h3 className="text-2xl font-bold leading-tight">Add project details in a guided flow</h3>
                <p className="text-zinc-300 text-sm mt-2">
                  Step-by-step setup helps your team capture project, location, and compliance details with clarity.
                </p>
                <div className="mt-6 rounded-xl border border-white/20 bg-white/5 p-4">
                  <svg viewBox="0 0 360 210" className="w-full h-40" role="img" aria-label="Building line illustration">
                    <g fill="none" stroke="#E5E7EB" strokeWidth="2">
                      <path d="M20 178 H340" />
                      <path d="M34 178 V74 H108 V178" />
                      <path d="M108 178 V52 H182 V178" />
                      <path d="M182 178 V86 H252 V178" />
                      <path d="M252 178 V66 H326 V178" />
                      <path d="M62 74 V54 H84 V74" />
                      <path d="M132 52 V30 H156 V52" />
                      <path d="M278 66 V44 H302 V66" />
                    </g>
                    <g fill="none" stroke="#A1A1AA" strokeWidth="1.5">
                      <rect x="46" y="90" width="16" height="16" />
                      <rect x="72" y="90" width="16" height="16" />
                      <rect x="46" y="116" width="16" height="16" />
                      <rect x="72" y="116" width="16" height="16" />

                      <rect x="122" y="68" width="14" height="14" />
                      <rect x="144" y="68" width="14" height="14" />
                      <rect x="166" y="68" width="14" height="14" />
                      <rect x="122" y="90" width="14" height="14" />
                      <rect x="144" y="90" width="14" height="14" />
                      <rect x="166" y="90" width="14" height="14" />
                      <rect x="122" y="112" width="14" height="14" />
                      <rect x="144" y="112" width="14" height="14" />
                      <rect x="166" y="112" width="14" height="14" />

                      <rect x="196" y="102" width="14" height="14" />
                      <rect x="218" y="102" width="14" height="14" />
                      <rect x="196" y="124" width="14" height="14" />
                      <rect x="218" y="124" width="14" height="14" />

                      <rect x="266" y="82" width="14" height="14" />
                      <rect x="288" y="82" width="14" height="14" />
                      <rect x="266" y="104" width="14" height="14" />
                      <rect x="288" y="104" width="14" height="14" />
                      <rect x="266" y="126" width="14" height="14" />
                      <rect x="288" y="126" width="14" height="14" />
                    </g>
                  </svg>
                </div>
                <div className="mt-5 space-y-2 text-sm">
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Better data quality from day one</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Easier handoff to inventory and sales</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Consistent setup across projects</p>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <CardHeader className="px-0 pt-0 pb-4">
                  <CardTitle>Create New Project</CardTitle>
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {["Basics", "Location", "Compliance", "Inventory"].map((stepName, idx) => {
                      const step = idx + 1
                      const active = projectOnboardingStep === step
                      const done = projectOnboardingStep > step
                      return (
                        <div
                          key={stepName}
                          className={`rounded-md border px-3 py-2 text-xs font-medium text-center ${
                            active ? "border-black bg-black text-white" : done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500"
                          }`}
                        >
                          {stepName}
                        </div>
                      )
                    })}
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-4">
                  {projectOnboardingStep === 1 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                          id="name"
                          value={projectDraft.name}
                          onChange={(e) => setProjectDraft({ ...projectDraft, name: e.target.value })}
                          placeholder="e.g., Skyline Residency"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={projectDraft.project_type} onValueChange={(v) => setProjectDraft({ ...projectDraft, project_type: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {projectTypes.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={projectDraft.status} onValueChange={(v) => setProjectDraft({ ...projectDraft, status: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {projectStatuses.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={projectDraft.description}
                          onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })}
                          placeholder="Short summary for your internal team"
                        />
                      </div>
                    </>
                  )}

                  {projectOnboardingStep === 2 && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" value={projectDraft.city} onChange={(e) => setProjectDraft({ ...projectDraft, city: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input id="state" value={projectDraft.state} onChange={(e) => setProjectDraft({ ...projectDraft, state: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={projectDraft.address}
                          onChange={(e) => setProjectDraft({ ...projectDraft, address: e.target.value })}
                          placeholder="Street, area, landmark"
                        />
                      </div>
                    </>
                  )}

                  {projectOnboardingStep === 3 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="rera_number">RERA Number</Label>
                        <Input
                          id="rera_number"
                          value={projectDraft.rera_number}
                          onChange={(e) => setProjectDraft({ ...projectDraft, rera_number: e.target.value })}
                          placeholder="Optional compliance identifier"
                        />
                      </div>
                      <div className="rounded-lg border bg-zinc-50 p-3 text-sm space-y-1">
                        <p><span className="text-zinc-500">Project:</span> {projectDraft.name || "-"}</p>
                        <p><span className="text-zinc-500">Type:</span> {projectTypes.find((t) => t.value === projectDraft.project_type)?.label || "-"}</p>
                        <p><span className="text-zinc-500">Status:</span> {projectStatuses.find((s) => s.value === projectDraft.status)?.label || "-"}</p>
                        <p><span className="text-zinc-500">Location:</span> {[projectDraft.city, projectDraft.state].filter(Boolean).join(", ") || "-"}</p>
                      </div>
                    </>
                  )}

                  {projectOnboardingStep === 4 && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-zinc-50 p-3">
                          <p className="text-xs text-zinc-500">Towers Planned</p>
                          <p className="text-xl font-semibold">{inventorySummary.towers}</p>
                        </div>
                        <div className="rounded-lg border bg-zinc-50 p-3">
                          <p className="text-xs text-zinc-500">Auto Flats to Create</p>
                          <p className="text-xl font-semibold">{inventorySummary.autoUnits}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-600">Add towers and optionally auto-generate flats.</p>
                        <div className="flex items-center gap-2">
                          {towerPlans.length > 1 && (
                            <Button type="button" size="sm" variant="outline" onClick={cloneDefaultsToAllTowers}>
                              Apply Defaults to All
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="outline" onClick={addTowerPlanRow}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Tower
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {towerPlans.map((plan, idx) => (
                          <div key={plan.id} className="rounded-lg border p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Tower Setup {idx + 1}</p>
                              {towerPlans.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTowerPlanRow(plan.id)}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Tower Name</Label>
                                <Input value={plan.name} onChange={(e) => updateTowerPlan(plan.id, { name: e.target.value })} placeholder="Tower 1" />
                              </div>
                              <div className="space-y-1">
                                <Label>Tower Code</Label>
                                <Input
                                  value={plan.code}
                                  onChange={(e) => updateTowerPlan(plan.id, { code: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })}
                                  placeholder="01"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Floors</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={plan.floors_count}
                                  onChange={(e) => updateTowerPlan(plan.id, { floors_count: Number(e.target.value || 0) })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Flats/Floor</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={plan.flats_per_floor}
                                  onChange={(e) => updateTowerPlan(plan.id, { flats_per_floor: Number(e.target.value || 0) })}
                                />
                              </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={plan.auto_create_flats}
                                onChange={(e) => updateTowerPlan(plan.id, { auto_create_flats: e.target.checked })}
                              />
                              Auto-create flats
                            </label>

                            {plan.auto_create_flats && (
                              <>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <Label>Unit Type</Label>
                                    <Input
                                      value={plan.unit_type}
                                      onChange={(e) => updateTowerPlan(plan.id, { unit_type: e.target.value })}
                                      placeholder="2bhk"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Area (sqft)</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={plan.super_built_up_area}
                                      onChange={(e) => updateTowerPlan(plan.id, { super_built_up_area: Number(e.target.value || 0) })}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Base Price</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={plan.base_price}
                                      onChange={(e) => updateTowerPlan(plan.id, { base_price: Number(e.target.value || 0) })}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label>Facing</Label>
                                  <Input value={plan.facing} onChange={(e) => updateTowerPlan(plan.id, { facing: e.target.value })} placeholder="north" />
                                </div>
                                <p className="text-xs text-zinc-500">
                                  Numbering preview: first <span className="font-medium">{getTowerNumberPreview(plan).first}</span>, last{" "}
                                  <span className="font-medium">{getTowerNumberPreview(plan).last}</span>
                                </p>
                                <p className="text-xs text-zinc-500">
                                  Will create {Math.max(0, plan.floors_count) * Math.max(0, plan.flats_per_floor)} flats for this tower.
                                </p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex justify-between gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={closeCreateModal}>
                      Cancel
                    </Button>
                    <div className="flex gap-2">
                      {projectOnboardingStep > 1 && (
                        <Button type="button" variant="outline" onClick={() => setProjectOnboardingStep((s) => s - 1)}>
                          Back
                        </Button>
                      )}
                      {projectOnboardingStep < 4 ? (
                        <Button
                          type="button"
                          onClick={() => {
                            if (projectOnboardingStep === 1 && !projectDraft.name.trim()) {
                              toast({ variant: "destructive", title: "Project name is required" })
                              return
                            }
                            setProjectOnboardingStep((s) => s + 1)
                          }}
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button type="button" onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                          {createProjectMutation.isPending ? "Creating..." : "Create Project & Inventory"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Tower Modal */}
      {showTowerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Add Tower</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTower} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tower Name (e.g., A, B, C)</Label>
                  <Input id="name" name="name" required placeholder="A" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floors_count">Number of Floors</Label>
                  <Input id="floors_count" name="floors_count" type="number" required defaultValue={10} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowTowerModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTowerMutation.isPending}>
                    {createTowerMutation.isPending ? "Creating..." : "Create Tower"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-2 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl">
            <CardHeader>
              <CardTitle>Add Unit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUnit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="floor">Floor</Label>
                    <Input id="floor" name="floor" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_number">Unit Number</Label>
                    <Input id="unit_number" name="unit_number" required placeholder="101" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Type</Label>
                    <Select name="unit_type" defaultValue="2bhk">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Facing</Label>
                    <Select name="facing" defaultValue="north">
                      <SelectTrigger>
                        <SelectValue placeholder="Select facing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="north">North</SelectItem>
                        <SelectItem value="south">South</SelectItem>
                        <SelectItem value="east">East</SelectItem>
                        <SelectItem value="west">West</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="super_built_up_area">Super Built-up Area (sqft)</Label>
                    <Input id="super_built_up_area" name="super_built_up_area" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_price">Base Price (per sqft)</Label>
                    <Input id="base_price" name="base_price" type="number" required />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowUnitModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUnitMutation.isPending}>
                    {createUnitMutation.isPending ? "Creating..." : "Create Unit"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pagination */}
      {data?.meta?.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {page} of {data.meta.pages}
          </span>
          <Button variant="outline" disabled={page >= data.meta.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
