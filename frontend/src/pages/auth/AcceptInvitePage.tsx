import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { usersApi } from '@/services/api'
import { useAuthStore } from '@/app/store'
import { useToast } from '@/components/ui/use-toast'
import { Building2, User, Mail, Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { setAuth, setMembership } = useAuthStore()

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    phone: '',
  })

  // Validate invite token
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ['validate-invite', token],
    queryFn: () => usersApi.validateInvite(token!).then((res) => res.data),
    enabled: !!token,
    retry: false,
  })

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: (data: { invite_token: string; password: string; phone?: string }) =>
      usersApi.acceptInvite(data).then((res) => res.data),
    onSuccess: async (data) => {
      toast({
        title: 'Welcome to the team!',
        description: 'Your account has been created successfully.',
      })
      
      // Get user info and set auth
      try {
        const userRes = await usersApi.getMe()
        const membershipRes = await usersApi.getMembership()
        setAuth(userRes.data, data.access_token, data.refresh_token)
        setMembership(membershipRes.data)
        navigate('/dashboard')
      } catch {
        // Fallback to login
        navigate('/login')
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to accept invitation',
        description: error.response?.data?.detail || 'Please try again.',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
      })
      return
    }

    if (form.password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
      })
      return
    }

    acceptMutation.mutate({
      invite_token: token!,
      password: form.password,
      phone: form.phone || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-zinc-900" />
          <p className="mt-2 text-zinc-600">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-4">
        <Card className="max-w-md w-full rounded-3xl border-zinc-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
              <h2 className="mt-4 text-xl font-semibold text-zinc-900">Invalid Invitation</h2>
              <p className="mt-2 text-zinc-600">
                This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
              </p>
              <div className="mt-6 space-y-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Go to Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="ghost" className="w-full">
                    Create New Account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <Card className="max-w-md w-full rounded-3xl border-zinc-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Complete your account setup to join the team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invite Details */}
          <div className="mb-6 p-4 bg-zinc-50 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Organisation</p>
                <p className="font-medium">{inviteData.organisation_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Your Name</p>
                <p className="font-medium">{inviteData.first_name} {inviteData.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="font-medium">{inviteData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Role</p>
                <p className="font-medium capitalize">{inviteData.role}</p>
              </div>
            </div>
          </div>

          {/* Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Create a password"
                required
                minLength={8}
              />
              <p className="text-xs text-zinc-500">Must be at least 8 characters</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Accept Invitation & Join'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-zinc-900 font-medium underline underline-offset-4 hover:text-zinc-700">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
