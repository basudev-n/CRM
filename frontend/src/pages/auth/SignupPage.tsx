import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, Mail, Lock, User, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [formData, setFormData] = useState({
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { toast } = useToast()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.sendOtp({ email })
      toast({ title: "OTP sent successfully!" })
      setStep(2)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to send OTP", description: error.response?.data?.detail || "Please try again" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.verifyOtp({ email, otp })
      toast({ title: "Email verified!" })
      setStep(3)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invalid OTP", description: error.response?.data?.detail || "Please check and try again" })
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await authApi.signup({ email, otp, ...formData })
      const { access_token, refresh_token } = response.data
      const userResponse = await authApi.me(access_token)
      setAuth(userResponse.data, access_token, refresh_token)
      navigate("/onboarding")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Signup failed", description: error.response?.data?.detail || "Something went wrong" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">PropFlow</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">
              {step === 1 && "Create your account"}
              {step === 2 && "Verify your email"}
              {step === 3 && "Complete your profile"}
            </h1>
            <p className="text-slate-500">
              {step === 1 && "Enter your email to get started"}
              {step === 2 && "We've sent a 6-digit OTP to your email"}
              {step === 3 && "Fill in your details to complete signup"}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200" required />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send OTP <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-700">Enter 6-digit OTP</Label>
                <Input id="otp" type="text" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-12 rounded-xl bg-slate-50 border-slate-200 text-center text-2xl tracking-widest" maxLength={6} required />
                <p className="text-sm text-slate-500">OTP sent to <span className="font-medium">{email}</span></p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600" disabled={loading || otp.length !== 6}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP"}</Button>
              </div>
              <button type="button" className="w-full text-sm text-slate-500 hover:text-slate-700" onClick={handleSendOtp}>Didn't receive OTP? Resend</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleCompleteSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-slate-700">First name *</Label>
                  <Input id="first_name" placeholder="John" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="h-11 rounded-xl bg-slate-50 border-slate-200" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-slate-700">Last name</Label>
                  <Input id="last_name" placeholder="Doe" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="h-11 rounded-xl bg-slate-50 border-slate-200" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700">Phone</Label>
                <Input id="phone" placeholder="+91 98765 43210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 rounded-xl bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="password" type="password" placeholder="Min 8 characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200" required minLength={8} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600" disabled={loading || !formData.first_name || !formData.password}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
              </div>
            </form>
          )}

          <div className="text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center mb-6">
              <svg className="w-20 h-20 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">Build Your Team</h2>
            <p className="text-indigo-200 text-lg">Invite your team members and collaborate in real-time.</p>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">&#10003;</div>
              <div className="text-left"><p className="font-semibold">Lead Management</p><p className="text-indigo-200 text-sm">Track and convert leads</p></div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">&#10003;</div>
              <div className="text-left"><p className="font-semibold">Pipeline Tracking</p><p className="text-indigo-200 text-sm">Visual sales pipeline</p></div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">&#10003;</div>
              <div className="text-left"><p className="font-semibold">Analytics</p><p className="text-indigo-200 text-sm">Data-driven insights</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
