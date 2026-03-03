import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { leadsApi, usersApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  User,
  Users,
  Phone,
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
}

interface OrgUser {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4 shadow-2xl shadow-slate-200/50">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
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
    assigned_to: "",
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null)
  const [actionMenuLead, setActionMenuLead] = useState<number | null>(null)
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
          source: filters.source || undefined,
          priority: filters.priority || undefined,
          status: filters.status || undefined,
          assigned_to: filters.assigned_to ? parseInt(filters.assigned_to) : undefined,
        })
        .then((res) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setShowCreateModal(false)
      toast({ title: "Lead created successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create lead", description: error.response?.data?.detail || "Unknown error" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setEditingLead(null)
      toast({ title: "Lead updated successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update lead", description: error.response?.data?.detail || "Unknown error" })
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, assigned_to }: { id: number; assigned_to: number | null }) =>
      leadsApi.update(id, { assigned_to }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      toast({ title: "Lead assigned successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to assign lead", description: error.response?.data?.detail || "Unknown error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setDeletingLead(null)
      toast({ title: "Lead deleted successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete lead", description: error.response?.data?.detail || "Unknown error" })
    },
  })

  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: any = {}
    formData.forEach((value, key) => {
      if (value) data[key] = value
    })
    if (data.budget_min) data.budget_min = parseFloat(data.budget_min)
    if (data.budget_max) data.budget_max = parseFloat(data.budget_max)
    if (data.assigned_to === "unassigned") data.assigned_to = null
    createMutation.mutate(data)
  }

  const handleUpdateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingLead) return
    const formData = new FormData(e.currentTarget)
    const data: any = {}
    formData.forEach((value, key) => {
      if (value) data[key] = value
    })
    if (data.budget_min) data.budget_min = parseFloat(data.budget_min)
    if (data.budget_max) data.budget_max = parseFloat(data.budget_max)
    if (data.assigned_to === "unassigned") data.assigned_to = null
    updateMutation.mutate({ id: editingLead.id, data })
  }

  const handleAssignAgent = (leadId: number, userId: string) => {
    const assigned_to = userId === "unassigned" ? null : parseInt(userId)
    assignMutation.mutate({ id: leadId, assigned_to })
  }

  const handleDeleteLead = () => {
    if (deletingLead) {
      deleteMutation.mutate(deletingLead.id)
    }
  }

  const getAssignedUser = (userId: number | null) => {
    if (!userId) return null
    return orgUsers?.find((u) => u.id === userId)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200"
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200"
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
          <p className="text-slate-500 mt-1">Manage and track your sales leads</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg shadow-slate-100/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search leads..."
                  className="pl-10 bg-slate-50 border-slate-200 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={filters.source}
              onValueChange={(value) => setFilters({ ...filters, source: value })}
            >
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="99acres">99acres</SelectItem>
                <SelectItem value="MagicBricks">MagicBricks</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilters({ ...filters, priority: value })}
            >
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Site Visit Scheduled">Site Visit</SelectItem>
                <SelectItem value="Negotiation">Negotiation</SelectItem>
                <SelectItem value="Won">Won</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="border-0 shadow-lg shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-600 text-sm">Lead</th>
                  <th className="text-left p-4 font-semibold text-slate-600 text-sm">Contact</th>
                  <th className="text-left p-4 font-semibold text-slate-600 text-sm">Source</th>
                  <th className="text-left p-4 font-semibold text-slate-600 text-sm">Priority</th>
                  <th className="text-left p-4 font-semibold text-slate-600 text-sm">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-600 text-sm">Assigned To</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((lead: Lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-semibold">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{lead.name}</p>
                          {lead.email && (
                            <p className="text-xs text-slate-500">{lead.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {lead.phone && (
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                        {lead.source || "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(
                          lead.priority
                        )}`}
                      >
                        {lead.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-600 capitalize">
                        {lead.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4">
                      <Select
                        value={lead.assigned_to?.toString() || "unassigned"}
                        onValueChange={(value) => handleAssignAgent(lead.id, value)}
                      >
                        <SelectTrigger className="w-[180px] bg-white border-slate-200 rounded-xl">
                          <div className="flex items-center gap-2">
                            {lead.assigned_to ? (
                              <>
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-medium">
                                  {getAssignedUser(lead.assigned_to)?.first_name?.charAt(0) || "?"}
                                </div>
                                <SelectValue placeholder="Assign agent">
                                  {getAssignedUser(lead.assigned_to)?.first_name} {getAssignedUser(lead.assigned_to)?.last_name || ""}
                                </SelectValue>
                              </>
                            ) : (
                              <>
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                  <User className="h-3 w-3" />
                                </div>
                                <SelectValue placeholder="Assign agent" />
                              </>
                            )}
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="h-3 w-3 text-slate-500" />
                              </div>
                              <span>Unassigned</span>
                            </div>
                          </SelectItem>
                          {orgUsers?.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-medium">
                                  {user.first_name.charAt(0)}
                                </div>
                                <span>{user.first_name} {user.last_name || ""}</span>
                                <span className="text-xs text-slate-400 ml-auto capitalize">({user.role})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-600"
                          onClick={() =>
                            setActionMenuLead(actionMenuLead === lead.id ? null : lead.id)
                          }
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {actionMenuLead === lead.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border-0 rounded-xl shadow-xl shadow-slate-200/50 z-10 min-w-[160px] overflow-hidden">
                            <button
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center text-sm"
                              onClick={() => {
                                setEditingLead(lead)
                                setActionMenuLead(null)
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2 text-slate-500" />
                              Edit Details
                            </button>
                            <button
                              className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center text-sm text-red-600"
                              onClick={() => {
                                setDeletingLead(lead)
                                setActionMenuLead(null)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data?.data?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No leads found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or add a new lead</p>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {data?.meta?.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-slate-600">
            Page {page} of {data.meta.pages}
          </span>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page >= data.meta.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Lead">
        <form onSubmit={handleCreateLead} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-slate-700">Name *</Label>
              <Input id="create-name" name="name" required className="rounded-xl bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email" className="text-slate-700">Email</Label>
              <Input id="create-email" name="email" type="email" className="rounded-xl bg-slate-50 border-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-phone" className="text-slate-700">Phone</Label>
              <Input id="create-phone" name="phone" className="rounded-xl bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Source</Label>
              <Select name="source">
                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="99acres">99acres</SelectItem>
                  <SelectItem value="MagicBricks">MagicBricks</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Priority</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Status</Label>
              <Select name="status" defaultValue="New">
                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Site Visit Scheduled">Site Visit</SelectItem>
                  <SelectItem value="Negotiation">Negotiation</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Assign To</Label>
            <Select name="assigned_to" defaultValue="unassigned">
              <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {orgUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.first_name} {user.last_name || ""} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-budget_min" className="text-slate-700">Min Budget (₹)</Label>
              <Input id="create-budget_min" name="budget_min" type="number" className="rounded-xl bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-budget_max" className="text-slate-700">Max Budget (₹)</Label>
              <Input id="create-budget_max" name="budget_max" type="number" className="rounded-xl bg-slate-50 border-slate-200" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-notes" className="text-slate-700">Notes</Label>
            <textarea
              id="create-notes"
              name="notes"
              className="flex min-h-[80px] w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600">
              {createMutation.isPending ? "Creating..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingLead} onClose={() => setEditingLead(null)} title="Edit Lead">
        {editingLead && (
          <form onSubmit={handleUpdateLead} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Name *</Label>
                <Input name="name" defaultValue={editingLead.name} required className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Email</Label>
                <Input name="email" type="email" defaultValue={editingLead.email || ""} className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Phone</Label>
                <Input name="phone" defaultValue={editingLead.phone || ""} className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Source</Label>
                <Select name="source" defaultValue={editingLead.source || ""}>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="99acres">99acres</SelectItem>
                    <SelectItem value="MagicBricks">MagicBricks</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Priority</Label>
                <Select name="priority" defaultValue={editingLead.priority || "medium"}>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Status</Label>
                <Select name="status" defaultValue={editingLead.status || "New"}>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Site Visit Scheduled">Site Visit</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Min Budget (₹)</Label>
                <Input name="budget_min" type="number" defaultValue={editingLead.budget_min || ""} className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Max Budget (₹)</Label>
                <Input name="budget_max" type="number" defaultValue={editingLead.budget_max || ""} className="rounded-xl bg-slate-50 border-slate-200" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Notes</Label>
              <textarea name="notes" className="flex min-h-[80px] w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm" rows={3} defaultValue={editingLead.notes || ""} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditingLead(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deletingLead} onClose={() => setDeletingLead(null)} title="Delete Lead">
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Delete Lead?</p>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <span className="font-medium">{deletingLead?.name}</span>? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeletingLead(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLead} disabled={deleteMutation.isPending} className="rounded-xl bg-red-500 hover:bg-red-600">
              {deleteMutation.isPending ? "Deleting..." : "Delete Lead"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
