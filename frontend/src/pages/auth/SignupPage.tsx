import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, Sparkles, TrendingUp, Users, BarChart3 } from "lucide-react"

interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
  percentage: number
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "None", color: "bg-zinc-300", percentage: 0 }

  let score = 0

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++

  // Character variety checks
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++

  // Normalize to 0-4 scale
  const normalizedScore = Math.min(4, Math.ceil(score / 1.75))

  const strengthLevels: PasswordStrength[] = [
    { score: 0, label: "Very Weak", color: "bg-red-500", percentage: 0 },
    { score: 1, label: "Weak", color: "bg-orange-500", percentage: 25 },
    { score: 2, label: "Fair", color: "bg-yellow-500", percentage: 50 },
    { score: 3, label: "Good", color: "bg-blue-500", percentage: 75 },
    { score: 4, label: "Strong", color: "bg-green-500", percentage: 100 },
  ]

  return strengthLevels[normalizedScore]
}

function getPasswordRequirements(password: string) {
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }
}

function truncateToByteLength(str: string, maxBytes: number): string {
  let byteLength = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    let charBytes = 1
    if (code > 0x7f) charBytes = 2
    if (code > 0x7ff) charBytes = 3
    if (code > 0xffff) charBytes = 4
    
    if (byteLength + charBytes > maxBytes) return str.substring(0, i)
    byteLength += charBytes
  }
  return str
}

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { toast } = useToast()

  const passwordStrength = calculatePasswordStrength(formData.password)
  const passwordRequirements = getPasswordRequirements(formData.password)
  const isPasswordValid = formData.password.length >= 8 && passwordStrength.score >= 2

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.sendOtp({ email })
      toast({ title: "OTP sent!", description: `A 6-digit verification code has been sent to ${email}` })
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
      // Truncate password to 72 bytes (bcrypt limit) as safety measure
      const truncatedPassword = truncateToByteLength(formData.password, 72)
      const response = await authApi.signup({ email, otp, ...formData, password: truncatedPassword })
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

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`
      const response = await authApi.getGoogleAuthUrl(redirectUri)
      window.location.href = response.data.url
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Sign-Up unavailable",
        description: error.response?.data?.detail || "Google OAuth is not configured",
      })
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full min-h-screen grid lg:grid-cols-2">
        {/* Left Panel - Branding (same as Login) */}
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
                  Start your 14-day free trial
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

        {/* Right Panel - Signup Form */}
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
            <div className="w-full max-w-sm space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      s <= step ? 'bg-zinc-900' : 'bg-zinc-200'
                    }`}
                  />
                ))}
              </div>

              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-zinc-900">
                  {step === 1 && "Create your account"}
                  {step === 2 && "Verify your email"}
                  {step === 3 && "Complete your profile"}
                </h1>
                <p className="text-zinc-500 text-sm">
                  {step === 1 && "Start your 14-day free trial today"}
                  {step === 2 && `We've sent a 6-digit code to ${email}`}
                  {step === 3 && "Fill in your details to get started"}
                </p>
              </div>

              {/* Step 1: Email */}
              {step === 1 && (
                <>
                  <form onSubmit={handleSendOtp} className="space-y-5">
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

                    <div className="flex items-start gap-2.5">
                      <input 
                        type="checkbox"
                        id="terms" 
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                      />
                      <label htmlFor="terms" className="text-sm text-zinc-500 leading-tight cursor-pointer">
                        I agree to the <span className="text-zinc-700 hover:underline">Terms of Service</span> and <span className="text-zinc-700 hover:underline">Privacy Policy</span>
                      </label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition-all" 
                      disabled={loading || !agreedToTerms}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending code...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Continue
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
                    onClick={handleGoogleSignUp}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Step 2: OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-sm font-medium text-zinc-700">Verification code</Label>
                    <Input 
                      id="otp" 
                      type="text" 
                      placeholder="000000" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} 
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 text-center text-xl tracking-[0.3em] focus:bg-white focus:border-zinc-300 focus-visible:ring-1 focus-visible:ring-zinc-200" 
                      maxLength={6} 
                      required 
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 h-11 rounded-xl border-zinc-200 hover:bg-zinc-50" 
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white" 
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                  
                  <button 
                    type="button" 
                    className="w-full text-sm text-zinc-500 hover:text-zinc-700 transition-colors" 
                    onClick={handleSendOtp}
                  >
                    Didn't receive code? <span className="font-medium underline underline-offset-4">Resend</span>
                  </button>
                </form>
              )}

              {/* Step 3: Profile */}
              {step === 3 && (
                <form onSubmit={handleCompleteSignup} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-sm font-medium text-zinc-700">First name</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input 
                          id="first_name" 
                          placeholder="John" 
                          value={formData.first_name} 
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} 
                          className="pl-10 h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-zinc-300 focus-visible:ring-1 focus-visible:ring-zinc-200" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-sm font-medium text-zinc-700">Last name</Label>
                      <Input 
                        id="last_name" 
                        placeholder="Doe" 
                        value={formData.last_name} 
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} 
                        className="h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-zinc-300 focus-visible:ring-1 focus-visible:ring-zinc-200" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium text-zinc-700">Phone number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input 
                        id="phone" 
                        name="tel"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+91 98765 43210" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                        className="pl-10 h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-zinc-300 focus-visible:ring-1 focus-visible:ring-zinc-200" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-zinc-700">Create password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="Min. 8 characters" 
                        value={formData.password} 
                        onChange={(e) => setFormData({ ...formData, password: truncateToByteLength(e.target.value, 72) })} 
                        className="pl-10 h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus:bg-white focus:border-zinc-300 focus-visible:ring-1 focus-visible:ring-zinc-200" 
                        required 
                        minLength={8}
                      />
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Password strength</span>
                          <span className={`text-xs font-medium ${
                            passwordStrength.score === 0 ? 'text-zinc-500' :
                            passwordStrength.score === 1 ? 'text-red-500' :
                            passwordStrength.score === 2 ? 'text-orange-500' :
                            passwordStrength.score === 3 ? 'text-blue-500' :
                            'text-green-500'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.percentage}%` }}
                          />
                        </div>
                        
                        {/* Password Requirements */}
                        <div className="grid grid-cols-2 gap-1 pt-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            {passwordRequirements.length ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-zinc-300 flex-shrink-0" />
                            )}
                            <span className={passwordRequirements.length ? 'text-green-600' : 'text-zinc-500'}>8+ characters</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            {passwordRequirements.uppercase ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-zinc-300 flex-shrink-0" />
                            )}
                            <span className={passwordRequirements.uppercase ? 'text-green-600' : 'text-zinc-500'}>Uppercase</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            {passwordRequirements.lowercase ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-zinc-300 flex-shrink-0" />
                            )}
                            <span className={passwordRequirements.lowercase ? 'text-green-600' : 'text-zinc-500'}>Lowercase</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            {passwordRequirements.number ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-zinc-300 flex-shrink-0" />
                            )}
                            <span className={passwordRequirements.number ? 'text-green-600' : 'text-zinc-500'}>Number</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 h-11 rounded-xl border-zinc-200 hover:bg-zinc-50" 
                      onClick={() => setStep(2)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium" 
                      disabled={loading || !formData.first_name || !isPasswordValid}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Create account
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Sign in link */}
              <p className="text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link to="/login" className="text-zinc-900 font-medium hover:underline underline-offset-4">
                  Sign in
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
