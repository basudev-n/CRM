import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { authApi, usersApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, Loader2 } from "lucide-react"

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth, setMembership } = useAuthStore()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code")
      const errorParam = searchParams.get("error")

      if (errorParam) {
        setError("Google sign-in was cancelled or failed")
        setTimeout(() => navigate("/login"), 2000)
        return
      }

      if (!code) {
        setError("No authorization code received")
        setTimeout(() => navigate("/login"), 2000)
        return
      }

      try {
        // Get the redirect URI that was used (must match what was sent to Google)
        const redirectUri = `${window.location.origin}/auth/google/callback`
        
        // Exchange code for tokens
        const response = await authApi.googleCallback(code, redirectUri)
        const { access_token, refresh_token } = response.data

        // Get user info with the token
        const userResponse = await authApi.me(access_token)
        setAuth(userResponse.data, access_token, refresh_token)

        // Try to get membership
        try {
          const membershipResponse = await usersApi.getMembership()
          setMembership(membershipResponse.data)
          navigate("/dashboard")
        } catch {
          // No membership - redirect to onboarding
          navigate("/onboarding")
        }

        toast({ title: "Welcome!", description: "Successfully signed in with Google" })
      } catch (error: any) {
        console.error("Google callback error:", error)
        setError(error.response?.data?.detail || "Failed to sign in with Google")
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: error.response?.data?.detail || "Failed to sign in with Google",
        })
        setTimeout(() => navigate("/login"), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate, setAuth, setMembership, toast])

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-semibold text-zinc-900 tracking-tight">PropFlow</span>
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg text-zinc-900 font-medium">{error}</p>
            <p className="text-sm text-zinc-500">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-zinc-400 animate-spin" />
            <p className="text-lg text-zinc-900 font-medium">Completing sign in...</p>
            <p className="text-sm text-zinc-500">Please wait while we verify your Google account</p>
          </div>
        )}
      </div>
    </div>
  )
}
