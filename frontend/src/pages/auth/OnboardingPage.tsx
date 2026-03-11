import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { orgApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, ArrowRight, ArrowLeft, Check, Users, BarChart3, FileText, Sparkles, Loader2, Building, Briefcase, Target, Rocket } from "lucide-react"

const steps = [
  { id: 1, title: "Welcome" },
  { id: 2, title: "Organisation" },
  { id: 3, title: "Ready" },
]

const orgTypes = [
  { value: "developer", label: "Real Estate Developer", icon: Building, description: "Build and sell properties" },
  { value: "broker", label: "Broker / Agency", icon: Briefcase, description: "Connect buyers with properties" },
  { value: "both", label: "Both", icon: Target, description: "Development + Brokerage" },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { setMembership, user } = useAuthStore()

  const [step, setStep] = useState(1)
  const [orgForm, setOrgForm] = useState({
    name: "",
    type: "developer",
    rera_number: "",
    address: "",
    phone: "",
  })

  const createOrgMutation = useMutation({
    mutationFn: (data: any) => orgApi.create(data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["organisation"] })
      setMembership({ organisation: { id: data.id, name: data.name }, role: "owner" })
      toast({ title: "Organisation created successfully!" })
      setStep(3)
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create organisation",
        description: error.response?.data?.detail || "Unknown error"
      })
    },
  })

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createOrgMutation.mutate(orgForm)
  }

  const handleSkip = () => {
    navigate("/dashboard")
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen w-full grid lg:grid-cols-2">
        {/* Left Panel - Form */}
        <div className="flex flex-col">
          {/* Header */}
          <div className="p-6 lg:p-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-zinc-900">PropFlow</span>
            </div>
            
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${step >= s.id 
                      ? 'bg-zinc-900 text-white' 
                      : 'bg-zinc-100 text-zinc-400'
                    }
                  `}>
                    {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 transition-colors ${step > s.id ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:px-12">
            <div className="w-full max-w-md">
              
              {/* Step 1: Welcome */}
              {step === 1 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-emerald-600">Welcome aboard!</p>
                    <h1 className="text-3xl font-semibold text-zinc-900">
                      Hi {user?.first_name || 'there'}! 👋
                    </h1>
                    <p className="text-zinc-500">
                      Let's set up your workspace in just a few steps.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: Users, title: "Manage your team", desc: "Invite members with role-based access" },
                      { icon: BarChart3, title: "Track your pipeline", desc: "Visual lead management & analytics" },
                      { icon: FileText, title: "Generate documents", desc: "Cost sheets, invoices & quotations" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                          <item.icon className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{item.title}</p>
                          <p className="text-sm text-zinc-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => setStep(2)}
                      className="w-full h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                    >
                      Let's go
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <button
                      onClick={handleSkip}
                      className="w-full text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      I'll do this later
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Organisation */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold text-zinc-900">Create your organisation</h1>
                    <p className="text-zinc-500 text-sm">This will be your company profile in PropFlow</p>
                  </div>

                  <form onSubmit={handleOrgSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="org-name" className="text-sm text-zinc-600">Organisation name*</Label>
                      <Input
                        id="org-name"
                        value={orgForm.name}
                        onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                        placeholder="Enter your company name"
                        required
                        className="h-11 rounded-lg border-zinc-200 focus:border-zinc-400 focus-visible:ring-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-zinc-600">Type of business</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {orgTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setOrgForm({ ...orgForm, type: type.value })}
                            className={`
                              flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                              ${orgForm.type === type.value 
                                ? 'border-zinc-900 bg-zinc-50' 
                                : 'border-zinc-200 hover:border-zinc-300'
                              }
                            `}
                          >
                            <div className={`
                              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                              ${orgForm.type === type.value ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}
                            `}>
                              <type.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-zinc-900 text-sm">{type.label}</p>
                              <p className="text-xs text-zinc-500">{type.description}</p>
                            </div>
                            {orgForm.type === type.value && (
                              <Check className="h-5 w-5 text-zinc-900 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rera" className="text-sm text-zinc-600">RERA Number</Label>
                        <Input
                          id="rera"
                          value={orgForm.rera_number}
                          onChange={(e) => setOrgForm({ ...orgForm, rera_number: e.target.value })}
                          placeholder="Optional"
                          className="h-11 rounded-lg border-zinc-200 focus:border-zinc-400 focus-visible:ring-0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm text-zinc-600">Phone</Label>
                        <Input
                          id="phone"
                          value={orgForm.phone}
                          onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="h-11 rounded-lg border-zinc-200 focus:border-zinc-400 focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 h-11 rounded-full border-zinc-300"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={createOrgMutation.isPending || !orgForm.name}
                        className="flex-1 h-11 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
                      >
                        {createOrgMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 3: Success */}
              {step === 3 && (
                <div className="space-y-8 text-center">
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Rocket className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-semibold text-zinc-900">You're all set!</h1>
                      <p className="text-zinc-500 mt-1">Your workspace is ready to go</p>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <Sparkles className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-800">14-Day Free Trial Active</span>
                    </div>
                    <p className="text-sm text-emerald-700">Full access to all features • No credit card required</p>
                  </div>

                  <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-zinc-900">{orgForm.name}</p>
                        <p className="text-xs text-zinc-500 capitalize">{orgForm.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        "Add your first lead",
                        "Invite team members", 
                        "Create cost sheets",
                        "Track pipeline"
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-zinc-600">
                          <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate("/dashboard")}
                    className="w-full h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Illustration */}
        <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

          <div className="relative z-10 w-full flex flex-col justify-center p-12 xl:p-16">
            {/* Main Content */}
            <div className="space-y-8">
              {/* Stats Preview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
                  <p className="text-4xl font-bold text-white mb-1">500+</p>
                  <p className="text-sm text-zinc-400">Companies trust us</p>
                </div>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
                  <p className="text-4xl font-bold text-white mb-1">₹2Cr+</p>
                  <p className="text-sm text-zinc-400">Deals tracked</p>
                </div>
              </div>

              {/* Feature Highlight */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Everything you need to scale</h3>
                <div className="space-y-3">
                  {[
                    { icon: Users, text: "Role-based team management" },
                    { icon: BarChart3, text: "Real-time analytics dashboard" },
                    { icon: FileText, text: "Automated document generation" },
                    { icon: Target, text: "Lead scoring & pipeline" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-zinc-300">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
                <p className="text-zinc-300 italic mb-4">
                  "PropFlow helped us close 40% more deals. The pipeline visibility is a game-changer."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-semibold text-white">
                    AK
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Amit Kumar</p>
                    <p className="text-xs text-zinc-500">CEO, Urban Developers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
