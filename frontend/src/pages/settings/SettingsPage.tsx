import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { orgApi, usersApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, Users, Plus, Copy, X, Clock, UserCheck, UserX, Edit2, Sparkles, RotateCcw } from "lucide-react"

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
    last_name: "",
  })

  const [editingUser, setEditingUser] = useState<number | null>(null)
  const [newRole, setNewRole] = useState("")

  // Fetch organisation
  const { data: orgData } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => orgApi.getMe().then((res) => res.data),
    enabled: !!membership,
  })

  // Fetch members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["org-members"],
    queryFn: () => usersApi.list().then((res) => res.data),
    enabled: !!membership,
  })

  // Fetch pending invites
  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: () => usersApi.getPendingInvites().then((res) => res.data),
    enabled: !!membership && (membership.role === "owner" || membership.role === "admin"),
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
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] })
      const inviteLink = `${window.location.origin}/invite/${response.data.invite_token}`
      toast({
        title: "Invitation sent successfully",
        description: (
          <div className="mt-2">
            <p className="text-sm mb-2">Share this invite link:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-zinc-100 px-2 py-1 rounded truncate max-w-[200px]">
                {inviteLink}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink)
                  toast({ title: "Link copied!" })
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ),
      })
      setInviteForm({ email: "", role: "agent", first_name: "", last_name: "" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to send invitation", description: error.response?.data?.detail })
    },
  })

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: number) => usersApi.cancelInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] })
      toast({ title: "Invitation cancelled" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to cancel invitation" })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      usersApi.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      setEditingUser(null)
      toast({ title: "Role updated successfully" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update role", description: error.response?.data?.detail })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => usersApi.deactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({ title: "User deactivated" })
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to deactivate user", description: error.response?.data?.detail })
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
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">Setup Your <span className="font-semibold">Organisation</span></h1>
          <p className="text-zinc-500 mt-2">Create your organisation to get started</p>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 max-w-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="text-lg font-semibold text-zinc-900">Organisation Details</h3>
            <p className="text-sm text-zinc-500 mt-1">This will be your company profile in PropFlow</p>
          </div>
          <div className="p-6">
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
          Org <span className="font-semibold">Settings</span>
        </h1>
        <p className="text-zinc-500 mt-2">Manage your organisation and team</p>
      </div>

      {/* Organisation Info */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organisation
          </h3>
        </div>
        <div className="p-6">
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
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({membersData?.length || 0})
          </h3>
          <p className="text-sm text-zinc-500 mt-1">Manage your team members and their roles</p>
        </div>
        <div className="p-6">
          {membersLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {membersData?.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{member.first_name} {member.last_name}</p>
                        <p className="text-sm text-zinc-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingUser === member.id ? (
                        <>
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="agent">Agent</option>
                            <option value="finance">Finance</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={() => updateRoleMutation.mutate({ userId: member.id, role: newRole })}
                            disabled={updateRoleMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingUser(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
                            {member.role}
                          </span>
                          {(membership.role === "owner" || membership.role === "admin") && member.role !== "owner" && member.id !== user?.id && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingUser(member.id)
                                  setNewRole(member.role)
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to deactivate ${member.first_name}?`)) {
                                    deactivateMutation.mutate(member.id)
                                  }
                                }}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending Invites */}
              {(membership.role === "owner" || membership.role === "admin") && pendingInvites && pendingInvites.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Invitations ({pendingInvites.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingInvites.map((invite: any) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100"
                      >
                        <div>
                          <p className="font-medium">{invite.first_name} {invite.last_name}</p>
                          <p className="text-sm text-zinc-500">{invite.email}</p>
                          <p className="text-xs text-zinc-400">
                            Expires: {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm capitalize">
                            {invite.role}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const inviteLink = `${window.location.origin}/invite/${invite.invite_token || '...'}`
                              navigator.clipboard.writeText(inviteLink)
                              toast({ title: "Invite link copied!" })
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => cancelInviteMutation.mutate(invite.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite Form */}
              {(membership.role === "owner" || membership.role === "admin") && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Invite New Member</h4>
                  <form onSubmit={handleInviteSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-first-name">First Name *</Label>
                        <Input
                          id="invite-first-name"
                          value={inviteForm.first_name}
                          onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-last-name">Last Name</Label>
                        <Input
                          id="invite-last-name"
                          value={inviteForm.last_name}
                          onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email *</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          required
                        />
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
                    </div>
                    <Button type="submit" disabled={inviteMutation.isPending}>
                      <Plus className="mr-2 h-4 w-4" />
                      {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Preferences
          </h3>
          <p className="text-sm text-zinc-500 mt-1">Customize your PropFlow experience</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Feature Tour</p>
              <p className="text-sm text-zinc-500">Replay the guided tour of PropFlow</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                usersApi.updateOnboardingStatus({ has_seen_tour: false }).then(() => {
                  toast({ title: "Tour reset", description: "Refresh the page to start the tour." })
                  queryClient.invalidateQueries({ queryKey: ["onboarding-status"] })
                })
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Replay Tour
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Getting Started Checklist</p>
              <p className="text-sm text-zinc-500">Show the onboarding checklist on dashboard</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                usersApi.updateOnboardingStatus({ onboarding_dismissed: false }).then(() => {
                  toast({ title: "Checklist restored", description: "The getting started checklist will now appear on your dashboard." })
                  queryClient.invalidateQueries({ queryKey: ["onboarding-status"] })
                })
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Show Checklist
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
