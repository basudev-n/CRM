import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { orgApi, usersApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, Users, Plus } from "lucide-react"

export default function SettingsPage() {
  const { user, membership } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [orgForm, setOrgForm] = useState({
    name: "",
    type: "developer",
    rera_number: "",
  })

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "agent",
    first_name: "",
  })

  // Fetch organisation
  const { data: orgData } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => orgApi.getMe().then((res) => res.data),
    enabled: !!membership,
  })

  // Fetch members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => orgApi.getMembers().then((res) => res.data),
    enabled: !!membership,
  })

  useEffect(() => {
    if (orgData) {
      setOrgForm({
        name: orgData.name || "",
        type: orgData.type || "developer",
        rera_number: orgData.rera_number || "",
      })
    }
  }, [orgData])

  const createOrgMutation = useMutation({
    mutationFn: (data: any) => orgApi.create(data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["organisation"] })
      toast({ title: "Organisation created successfully" })
      // Update membership with the new org
      const { setMembership } = useAuthStore.getState()
      setMembership({ organisation: { id: data.id, name: data.name }, role: "owner" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create organisation", description: error.response?.data?.detail || "Unknown error" })
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (data: any) => usersApi.invite(data),
    onSuccess: () => {
      toast({ title: "Invitation sent successfully" })
      setInviteForm({ email: "", role: "agent", first_name: "" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to send invitation" })
    },
  })

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createOrgMutation.mutate(orgForm)
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMutation.mutate(inviteForm)
  }

  if (!membership) {
    // Show organisation creation form
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Setup Your Organisation</h1>
          <p className="text-gray-500 mt-1">Create your organisation to get started</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Organisation Details</CardTitle>
            <CardDescription>
              This will be your company profile in PropFlow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOrgSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organisation Name *</Label>
                <Input
                  id="org-name"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  placeholder="Your Company Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-type">Type</Label>
                <select
                  id="org-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={orgForm.type}
                  onChange={(e) => setOrgForm({ ...orgForm, type: e.target.value })}
                >
                  <option value="developer">Real Estate Developer</option>
                  <option value="broker">Broker/Agency</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rera">RERA Number</Label>
                <Input
                  id="rera"
                  value={orgForm.rera_number}
                  onChange={(e) => setOrgForm({ ...orgForm, rera_number: e.target.value })}
                  placeholder="RERA/REALESTATE/2025/0001"
                />
              </div>
              <Button type="submit" disabled={createOrgMutation.isPending}>
                {createOrgMutation.isPending ? "Creating..." : "Create Organisation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your organisation and team</p>
      </div>

      {/* Organisation Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Name:</span> {membership.organisation.name}
            </p>
            <p className="text-sm">
              <span className="font-medium">Type:</span> {orgData?.type}
            </p>
            {orgData?.rera_number && (
              <p className="text-sm">
                <span className="font-medium">RERA:</span> {orgData.rera_number}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {membersData?.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>

              {/* Invite Form */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4">Invite New Member</h4>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-first-name">First Name</Label>
                      <Input
                        id="invite-first-name"
                        value={inviteForm.first_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <select
                      id="invite-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="agent">Agent</option>
                      <option value="finance">Finance</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={inviteMutation.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
