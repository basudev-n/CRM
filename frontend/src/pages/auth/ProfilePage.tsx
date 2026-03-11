import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api, orgApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { User, Mail, Phone, Building2, Shield, Save, Loader2, Camera } from "lucide-react"

interface UserProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar: string | null
  is_email_verified: boolean
}

interface Organisation {
  id: number
  name: string
  type: string
  logo: string | null
}

interface Membership {
  organisation: Organisation
  role: string
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, membership, setAuth, setMembership } = useAuthStore()
  const { toast } = useToast()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  })

  // Fetch user profile
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await api.get("/auth/me")
      return res.data as UserProfile
    },
  })

  // Fetch organisation
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ["organisation"],
    queryFn: async () => {
      const res = await orgApi.getMe()
      return res.data as Organisation
    },
  })

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.patch("/users/me", data).then((res) => res.data),
    onSuccess: (data) => {
      setAuth(data, useAuthStore.getState().accessToken || "", useAuthStore.getState().refreshToken || "")
      queryClient.invalidateQueries({ queryKey: ["userProfile"] })
      setIsEditing(false)
      toast({ title: "Profile updated successfully" })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: error.response?.data?.detail || "Unknown error",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-700"
      case "admin":
        return "bg-blue-100 text-blue-700"
      case "manager":
        return "bg-green-100 text-green-700"
      case "agent":
        return "bg-yellow-100 text-yellow-700"
      case "finance":
        return "bg-emerald-100 text-emerald-700"
      default:
        return "bg-zinc-100 text-zinc-700"
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Account <span className="font-semibold">Settings</span>
          </h1>
          <p className="text-zinc-500 mt-2">Manage your profile and organisation details</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-full border-zinc-300 hover:bg-zinc-100">
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </h3>
        </div>
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center text-white text-3xl font-bold">
                    {userData?.first_name?.[0]}
                    {userData?.last_name?.[0]}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-white hover:bg-zinc-600">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                {/* User Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">
                      {userData?.first_name} {userData?.last_name}
                    </h2>
                    {userData?.is_email_verified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Mail className="h-4 w-4" />
                      {userData?.email}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Phone className="h-4 w-4" />
                      {userData?.phone || "Not set"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organisation Card */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organisation
          </h3>
          <p className="text-sm text-zinc-500 mt-1">Your organisation details and role</p>
        </div>
        <div className="p-6">
          {orgLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : orgData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                  {orgData.logo ? (
                    <img src={orgData.logo} alt={orgData.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Building2 className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{orgData.name}</h3>
                  <p className="text-zinc-500 capitalize">{orgData.type}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-700">Your Role</span>
                </div>
                <Badge className={getRoleBadgeColor(membership?.role || "viewer")}>
                  {membership?.role || "viewer"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500 mb-4">No organisation found</p>
              <Button onClick={() => navigate("/onboarding")} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
                Create Organisation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Security</h3>
          <p className="text-sm text-zinc-500 mt-1">Manage your account security</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-zinc-500">Last changed 30 days ago</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-zinc-500">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
          <p className="text-sm text-zinc-500 mt-1">Irreversible actions for your account</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-2xl">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-zinc-500">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
