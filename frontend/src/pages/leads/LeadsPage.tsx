import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { leadsApi, notesApi, usersApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Users,
  Clock,
  AlertTriangle,
  MessageSquare,
} from "lucide-react"

interface Lead {
  id: number
  name: string
  email: string
  phone: string
  source: string
  priority: string
  status: string
  budget_min: number | null
  budget_max: number | null
  unit_type_preference: string
  notes: string
  project_interest: string
  assigned_to: number | null
  created_at: string
  score?: number
}

interface OrgUser {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
}

interface TimelineItem {
  type: "activity" | "note" | "visit"
  id: number
  title?: string
  content?: string
  description?: string
  created_at: string
  user?: {
    first_name: string
    last_name?: string
  }
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-200/50">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    source: "",
    priority: "",
    status: "",
    assigned_to: null as number | null,
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showAgingModal, setShowAgingModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<number[]>([])
  const [bulkAssignTo, setBulkAssignTo] = useState("")
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null)
  const [newNote, setNewNote] = useState("")
  
  // Form state for create lead
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    phone: "",
    source: "website",
    priority: "medium",
    assigned_to: "",
    budget_min: "",
    budget_max: "",
    unit_type_preference: "",
    notes: "",
    project_interest: "",
  })

  // Form state for edit lead
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    source: "website",
    priority: "medium",
    assigned_to: "",
    budget_min: "",
    budget_max: "",
    unit_type_preference: "",
    notes: "",
    project_interest: "",
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: orgUsers } = useQuery<OrgUser[]>({
    queryKey: ["org-users"],
    queryFn: () => usersApi.list().then((res) => res.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, search, filters],
    queryFn: () =>
      leadsApi
        .list({
          page,
          per_page: 20,
          search: search || undefined,
          ...filters,
        })
        .then((res) => res.data),
  })

  // Aging leads query
  const { data: agingData } = useQuery({
    queryKey: ["leads-aging"],
    queryFn: () => leadsApi.getAging().then((res) => res.data),
    enabled: showAgingModal,
  })

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["lead-timeline", timelineLead?.id],
    queryFn: () =>
      timelineLead?.id
        ? leadsApi.getTimeline(timelineLead.id, { page: 1, per_page: 50 }).then((res) => res.data)
        : Promise.resolve({ data: [] }),
    enabled: !!timelineLead?.id,
  })

  const sources = [
    "99acres",
    "MagicBricks",
    "Housing.com",
    "NoBroker",
    "Facebook",
    "Google",
    "Website",
    "Referral",
    "Walk-in",
    "Exhibition",
    "Other",
  ]

  const createMutation = useMutation({
    mutationFn: (data: any) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setShowCreateModal(false)
      toast({ title: "Lead created successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create lead" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setEditingLead(null)
      toast({ title: "Lead updated successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to update lead" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setDeletingLead(null)
      toast({ title: "Lead deleted successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to delete lead" })
    },
  })

  const bulkAssignMutation = useMutation({
    mutationFn: ({ leadIds, assignedTo }: { leadIds: number[]; assignedTo: number }) =>
      leadsApi.bulkAssign(leadIds, assignedTo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setShowBulkModal(false)
      setSelectedLeads([])
      setBulkAssignTo("")
      toast({ title: `${data.data.updated} leads assigned successfully` })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to assign leads" })
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: (payload: { lead_id: number; content: string }) => notesApi.create(payload),
    onSuccess: () => {
      if (timelineLead?.id) {
        queryClient.invalidateQueries({ queryKey: ["lead-timeline", timelineLead.id] })
      }
      setNewNote("")
      toast({ title: "Note added" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to add note" })
    },
  })

  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data: any = { ...createFormData }
    if (data.budget_min) data.budget_min = Number(data.budget_min)
    if (data.budget_max) data.budget_max = Number(data.budget_max)
    if (data.assigned_to) data.assigned_to = Number(data.assigned_to)
    else delete data.assigned_to
    createMutation.mutate(data)
  }

  const handleUpdateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingLead) return
    const data: any = {
      name: editingLead.name,
      email: editingLead.email,
      phone: editingLead.phone,
      source: editingLead.source,
      priority: editingLead.priority,
      assigned_to: editingLead.assigned_to,
      budget_min: editingLead.budget_min,
      budget_max: editingLead.budget_max,
      notes: editingLead.notes,
      unit_type_preference: editingLead.unit_type_preference,
      project_interest: editingLead.project_interest,
    }
    if (data.budget_min) data.budget_min = Number(data.budget_min)
    if (data.budget_max) data.budget_max = Number(data.budget_max)
    if (data.assigned_to) data.assigned_to = Number(data.assigned_to)
    else delete data.assigned_to
    updateMutation.mutate({ id: editingLead.id, data })
  }

  const handleBulkAssign = () => {
    if (selectedLeads.length === 0) {
      toast({ variant: "destructive", title: "Please select leads to assign" })
      return
    }
    if (!bulkAssignTo) {
      toast({ variant: "destructive", title: "Please select an agent" })
      return
    }
    bulkAssignMutation.mutate({ leadIds: selectedLeads, assignedTo: Number(bulkAssignTo) })
  }

  const toggleLeadSelection = (id: number) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    )
  }

  const selectAllLeads = () => {
    if (selectedLeads.length === data?.data?.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(data?.data?.map((l: Lead) => l.id) || [])
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700"
      case "medium": return "bg-yellow-100 text-yellow-700"
      case "low": return "bg-green-100 text-green-700"
      default: return "bg-zinc-100 text-zinc-700"
    }
  }

  const handleAddNote = () => {
    if (!timelineLead?.id || !newNote.trim()) return
    addNoteMutation.mutate({ lead_id: timelineLead.id, content: newNote.trim() })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Lead <span className="font-semibold">Engine</span>
          </h1>
          <p className="text-zinc-500 mt-2">Capture, qualify, and assign leads with precision.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAgingModal(true)}
            className="rounded-full border-zinc-300 hover:bg-zinc-100"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Aging ({agingData?.total || 0})
          </Button>
          <Button variant="outline" onClick={() => setShowBulkModal(true)} disabled={selectedLeads.length === 0} className="rounded-full border-zinc-300 hover:bg-zinc-100">
            <Users className="mr-2 h-4 w-4" />
            Bulk Assign ({selectedLeads.length})
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search leads..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={filters.source} onValueChange={(v) => setFilters({ ...filters, source: v })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="site_visit">Site Visit</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b bg-zinc-50">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === data?.data?.length && data?.data?.length > 0}
                        onChange={selectAllLeads}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-4 font-medium text-zinc-600">Name</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Source</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Budget</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Priority</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Score</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Status</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Assigned</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((lead: Lead) => (
                    <tr key={lead.id} className="border-b hover:bg-zinc-50 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-zinc-900">{lead.name}</div>
                        <div className="text-xs text-zinc-500">{lead.email}</div>
                      </td>
                      <td className="p-4 text-sm">{lead.source}</td>
                      <td className="p-4 text-sm">
                        {lead.budget_min || lead.budget_max
                          ? `₹${(lead.budget_min || 0) / 100000}L - ₹${(lead.budget_max || 0) / 100000}L`
                          : "-"}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-zinc-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-black"
                              style={{ width: `${lead.score || 0}%` }}
                            />
                          </div>
                          <span className="text-xs">{lead.score || 0}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm capitalize">{lead.status}</td>
                      <td className="p-4 text-sm">
                        {lead.assigned_to
                          ? orgUsers?.find((u) => u.id === lead.assigned_to)?.first_name || "Assigned"
                          : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setTimelineLead(lead)}>
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingLead(lead)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingLead(lead)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-zinc-500">No leads found</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      {data?.meta?.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {data.meta.pages}</span>
          <Button variant="outline" disabled={page >= data.meta.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateFormData({ name: "", email: "", phone: "", source: "website", priority: "medium", assigned_to: "", budget_min: "", budget_max: "", unit_type_preference: "", notes: "", project_interest: "" }) }} title="Create Lead">
          <form onSubmit={handleCreateLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={createFormData.name} onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={createFormData.email} onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={createFormData.phone} onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={createFormData.source} onValueChange={(value) => setCreateFormData({ ...createFormData, source: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s.toLowerCase().replace(" ", "_")}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={createFormData.priority} onValueChange={(value) => setCreateFormData({ ...createFormData, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={createFormData.assigned_to} onValueChange={(value) => setCreateFormData({ ...createFormData, assigned_to: value })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {orgUsers?.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Budget (₹)</Label>
                <Input type="number" value={createFormData.budget_min} onChange={(e) => setCreateFormData({ ...createFormData, budget_min: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Budget (₹)</Label>
                <Input type="number" value={createFormData.budget_max} onChange={(e) => setCreateFormData({ ...createFormData, budget_max: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea value={createFormData.notes} onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })} className="w-full rounded-md border p-2" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); setCreateFormData({ name: "", email: "", phone: "", source: "website", priority: "medium", assigned_to: "", budget_min: "", budget_max: "", unit_type_preference: "", notes: "", project_interest: "" }) }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <Modal open={!!editingLead} onClose={() => { setEditingLead(null); setEditFormData({ name: "", email: "", phone: "", source: "website", priority: "medium", assigned_to: "", budget_min: "", budget_max: "", unit_type_preference: "", notes: "", project_interest: "" }) }} title="Edit Lead">
          <form onSubmit={handleUpdateLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={editingLead.name} onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editingLead.email} onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editingLead.phone} onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={editingLead.source} onValueChange={(value) => setEditingLead({ ...editingLead, source: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s.toLowerCase().replace(" ", "_")}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editingLead.priority} onValueChange={(value) => setEditingLead({ ...editingLead, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={editingLead.assigned_to?.toString() || ""} onValueChange={(value) => setEditingLead({ ...editingLead, assigned_to: value ? Number(value) : null })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {orgUsers?.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Budget (₹)</Label>
                <Input type="number" value={editingLead.budget_min || ""} onChange={(e) => setEditingLead({ ...editingLead, budget_min: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="space-y-2">
                <Label>Max Budget (₹)</Label>
                <Input type="number" value={editingLead.budget_max || ""} onChange={(e) => setEditingLead({ ...editingLead, budget_max: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea value={editingLead.notes} onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })} className="w-full rounded-md border p-2" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setEditingLead(null); setEditFormData({ name: "", email: "", phone: "", source: "website", priority: "medium", assigned_to: "", budget_min: "", budget_max: "", unit_type_preference: "", notes: "", project_interest: "" }) }}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLead && (
        <Modal open={!!deletingLead} onClose={() => setDeletingLead(null)} title="Delete Lead">
          <div className="space-y-4">
            <p>Are you sure you want to delete this lead?</p>
            <p className="font-medium">{deletingLead.name}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingLead(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deletingLead.id)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Assign Modal */}
      {showBulkModal && (
        <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Assign Leads">
          <div className="space-y-4">
            <p>Assign {selectedLeads.length} selected leads to:</p>
            <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                {orgUsers?.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-zinc-300" onClick={() => setShowBulkModal(false)}>Cancel</Button>
              <Button onClick={handleBulkAssign} disabled={bulkAssignMutation.isPending}>
                {bulkAssignMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Aging Leads Modal */}
      {showAgingModal && (
        <Modal open={showAgingModal} onClose={() => setShowAgingModal(false)} title="Aging Leads">
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">Leads with no activity in the last 7+ days</p>
            {agingData?.leads && Object.entries(agingData.leads).map(([period, leads]: [string, any]) => (
              <div key={period} className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">{period} days</h4>
                <div className="space-y-1">
                  {leads.length > 0 ? leads.slice(0, 5).map((l: Lead) => (
                    <div key={l.id} className="text-sm flex justify-between">
                      <span>{l.name}</span>
                      <span className="text-zinc-500">{l.email}</span>
                    </div>
                  )) : <p className="text-xs text-zinc-400">No leads</p>}
                  {leads.length > 5 && <p className="text-xs text-zinc-500">+{leads.length - 5} more</p>}
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowAgingModal(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lead Timeline Modal */}
      {timelineLead && (
        <Modal open={!!timelineLead} onClose={() => { setTimelineLead(null); setNewNote("") }} title={`Timeline: ${timelineLead.name}`}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Note (@mention supported)</Label>
              <textarea
                className="w-full rounded-md border p-2"
                rows={3}
                placeholder="Type your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handleAddNote} disabled={addNoteMutation.isPending || !newNote.trim()}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {timelineLoading ? (
                <p className="text-sm text-zinc-500">Loading timeline...</p>
              ) : (timelineData?.data?.length || 0) === 0 ? (
                <p className="text-sm text-zinc-500">No timeline items yet.</p>
              ) : (
                timelineData.data.map((item: TimelineItem) => (
                  <div key={`${item.type}-${item.id}`} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium capitalize">{item.type}</p>
                      <p className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-zinc-800 mt-1">{item.title || item.content || item.description || "-"}</p>
                    {item.user && (
                      <p className="text-xs text-zinc-500 mt-2">
                        by {item.user.first_name} {item.user.last_name || ""}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
