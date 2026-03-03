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
import { contactsApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Search, MoreVertical } from "lucide-react"

export default function ContactsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [contactType, setContactType] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
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

  const handleCreateContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate(Object.fromEntries(formData))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your contacts and prospects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Contact
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={contactType}
              onValueChange={setContactType}
            >
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
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <>
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Name</th>
                    <th className="text-left p-4 font-medium text-gray-600">Email</th>
                    <th className="text-left p-4 font-medium text-gray-600">Phone</th>
                    <th className="text-left p-4 font-medium text-gray-600">Type</th>
                    <th className="text-left p-4 font-medium text-gray-600">Created</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((contact: any) => (
                    <tr key={contact.id} className="border-b hover:bg-gray-50">
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
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-gray-500">No contacts found</div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.meta?.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {page} of {data.meta.pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.meta.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
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
    </div>
  )
}
