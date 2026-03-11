import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { contactsApi, activitiesApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Search, MoreVertical, X, Upload, Merge, Clock, Mail, Phone, User, FileText } from "lucide-react"

export default function ContactsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [contactType, setContactType] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [mergeSourceId, setMergeSourceId] = useState("")
  const [mergeTargetId, setMergeTargetId] = useState("")
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", page, search, contactType],
    queryFn: () =>
      contactsApi
        .list({
          page,
          per_page: 20,
          search: search || undefined,
          contact_type: contactType || undefined,
        })
        .then((res) => res.data),
  })

  // Timeline query
  const { data: timelineData } = useQuery({
    queryKey: ["contactTimeline", selectedContact?.id],
    queryFn: () =>
      selectedContact?.id ? contactsApi.getTimeline(selectedContact.id).then(res => res.data) : null,
    enabled: !!selectedContact?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => contactsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      setShowCreateModal(false)
      toast({ title: "Contact created successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create contact" })
    },
  })

  const mergeMutation = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: number; targetId: number }) =>
      contactsApi.merge(sourceId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      setShowMergeModal(false)
      setMergeSourceId("")
      setMergeTargetId("")
      toast({ title: "Contacts merged successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to merge contacts", description: error.response?.data?.detail })
    },
  })

  const importMutation = useMutation({
    mutationFn: (formData: FormData) => contactsApi.importCsv(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      setShowImportModal(false)
      toast({ title: `Imported ${data.data?.imported || 0} contacts` })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to import contacts" })
    },
  })

  const handleCreateContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate(Object.fromEntries(formData))
  }

  const handleMerge = () => {
    if (!mergeSourceId || !mergeTargetId) {
      toast({ variant: "destructive", title: "Please select both contacts" })
      return
    }
    if (mergeSourceId === mergeTargetId) {
      toast({ variant: "destructive", title: "Please select different contacts" })
      return
    }
    mergeMutation.mutate({ sourceId: Number(mergeSourceId), targetId: Number(mergeTargetId) })
  }

  const handleImport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get("file") as File
    if (!file || file.size === 0) {
      toast({ variant: "destructive", title: "Please select a file" })
      return
    }
    const data = new FormData()
    data.append("file", file)
    importMutation.mutate(data)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />
      case "call": return <Phone className="h-4 w-4" />
      case "note": return <FileText className="h-4 w-4" />
      case "meeting": return <User className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Your <span className="font-semibold">Contacts</span>
          </h1>
          <p className="text-zinc-500 mt-2">Manage your contacts and prospects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)} className="rounded-full border-zinc-300 hover:bg-zinc-100">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={() => setShowMergeModal(true)} className="rounded-full border-zinc-300 hover:bg-zinc-100">
            <Merge className="mr-2 h-4 w-4" />
            Merge
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Contact
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
                  placeholder="Search contacts..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={contactType} onValueChange={setContactType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="broker">Broker</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <>
              <table className="w-full">
                <thead className="border-b bg-zinc-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-zinc-600">Name</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Email</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Phone</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Type</th>
                    <th className="text-left p-4 font-medium text-zinc-600">Created</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((contact: any) => (
                    <tr key={contact.id} className="border-b hover:bg-zinc-50">
                      <td className="p-4">
                        <div className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{contact.email || "-"}</td>
                      <td className="p-4 text-sm">{contact.phone || "-"}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {contact.contact_type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-zinc-500">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedContact(contact)}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-zinc-500">No contacts found</div>
              )}
            </>
          )}
        </div>
      </div>

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

      {/* Timeline Sidebar */}
      {selectedContact && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">{selectedContact.first_name} {selectedContact.last_name}</h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedContact(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            <h4 className="font-medium text-sm text-zinc-500 mb-4">Activity Timeline</h4>
            <div className="space-y-4">
              {timelineData?.data?.length > 0 ? (
                timelineData.data.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-zinc-500">{activity.description}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Create New Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateContact} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input id="first_name" name="first_name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" name="last_name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_type">Type</Label>
                  <Select name="contact_type" defaultValue="prospect">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="broker">Broker</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <textarea
                    id="address"
                    name="address"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Contact"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Merge Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500">
                Select two contacts to merge. The second contact will be merged into the first one.
              </p>
              <div className="space-y-2">
                <Label>Source Contact (will be removed)</Label>
                <Select value={mergeSourceId} onValueChange={setMergeSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.data?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.first_name} {c.last_name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Contact (will remain)</Label>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.data?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.first_name} {c.last_name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowMergeModal(false)}>Cancel</Button>
                <Button onClick={handleMerge} disabled={mergeMutation.isPending}>
                  {mergeMutation.isPending ? "Merging..." : "Merge Contacts"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Import Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label>CSV File</Label>
                  <Input type="file" name="file" accept=".csv" />
                </div>
                <p className="text-xs text-zinc-500">
                  Upload a CSV file with columns: first_name, last_name, email, phone, address
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={importMutation.isPending}>
                    {importMutation.isPending ? "Importing..." : "Import"}
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
