import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi, usersApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, Mail, Lock, ArrowRight, ShieldCheck, BarChart3, Users, Loader2, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

      navigate("/dashboard")
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`
      const response = await authApi.getGoogleAuthUrl(redirectUri)
      // Redirect to Google OAuth
      window.location.href = response.data.url
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Sign-In unavailable",
        description: error.response?.data?.detail || "Google OAuth is not configured",
      })
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full min-h-screen grid lg:grid-cols-2">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex bg-zinc-900 text-white relative overflow-hidden">
          {/* Gradient Orbs */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-blue-500/15 to-transparent rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          <div className="relative z-10 w-full flex flex-col justify-between p-10 xl:p-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                <Building2 className="h-5 w-5 text-zinc-900" />
              </div>
              <span className="text-xl font-semibold">PropFlow</span>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm text-zinc-300 mb-6">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Trusted by 500+ companies
                </div>
                <h1 className="text-4xl xl:text-5xl font-light leading-tight">
                  The CRM built for<br />
                  <span className="font-semibold">Indian Real Estate</span>
                </h1>
                <p className="text-zinc-400 mt-4 text-lg max-w-md">
                  Manage leads, track inventory, and close deals faster with PropFlow.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <TrendingUp className="h-5 w-5 text-emerald-400 mb-2" />
                  <p className="text-2xl font-semibold">40%</p>
                  <p className="text-xs text-zinc-400">More conversions</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <Users className="h-5 w-5 text-blue-400 mb-2" />
                  <p className="text-2xl font-semibold">50K+</p>
                  <p className="text-xs text-zinc-400">Active users</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <BarChart3 className="h-5 w-5 text-amber-400 mb-2" />
                  <p className="text-2xl font-semibold">₹2Cr+</p>
                  <p className="text-xs text-zinc-400">Deals tracked</p>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-zinc-300 italic mb-4">
                "PropFlow transformed our sales process. We closed 40% more deals in Q1 alone."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-semibold text-white">
                  RK
                </div>
                <div>
                  <p className="font-medium text-sm">Rajesh Kumar</p>
                  <p className="text-xs text-zinc-500">Director, Skyline Developers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden p-6 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-zinc-900">PropFlow</span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
            <div className="w-full max-w-sm space-y-8">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-zinc-900">Welcome back</h1>
                <p className="text-zinc-500 text-sm">Sign in to continue to your dashboard</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-700">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-zinc-300 focus-visible:ring-1 focus-visible:ring-zinc-200 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-sm font-medium text-zinc-700">Password</Label>
                    <button type="button" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-zinc-300 focus-visible:ring-1 focus-visible:ring-zinc-200 transition-colors"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-zinc-500">or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-zinc-500">
                Don't have an account?{" "}
                <Link to="/signup" className="text-zinc-900 font-medium hover:underline underline-offset-4">
                  Create one
                </Link>
              </p>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-center gap-6 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    SSL Secured
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    GDPR Compliant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
