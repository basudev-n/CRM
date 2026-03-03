import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi, usersApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, Mail, Lock, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth, setMembership } = useAuthStore()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authApi.login(email, password)
      const { access_token, refresh_token } = response.data

      // Get user info with the token
      const userResponse = await authApi.me(access_token)
      setAuth(userResponse.data, access_token, refresh_token)

      // Try to get membership - will redirect if not exists
      try {
        const membershipResponse = await usersApi.getMembership()
        setMembership(membershipResponse.data)
      } catch {
        // No membership - ProtectedRoute will redirect to onboarding
      }

      navigate("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.response?.data?.detail || "Invalid credentials",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              PropFlow
            </span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500">Sign in to your PropFlow account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200 transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Create one
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center mb-6">
              <svg className="w-20 h-20 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">Real Estate CRM</h2>
            <p className="text-indigo-200 text-lg">Manage leads, track pipeline, and close more deals with PropFlow.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
              <p className="text-3xl font-bold">10x</p>
              <p className="text-indigo-200 text-sm">Faster</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
              <p className="text-3xl font-bold">50%</p>
              <p className="text-indigo-200 text-sm">More Deals</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
              <p className="text-3xl font-bold">100%</p>
              <p className="text-indigo-200 text-sm">Organized</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
