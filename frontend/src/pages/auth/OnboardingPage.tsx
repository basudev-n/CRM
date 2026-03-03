import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { orgApi } from "@/services/api"
import { useAuthStore } from "@/app/store"
import { useToast } from "@/components/ui/use-toast"
import { Building2, ArrowRight, ArrowLeft, Check, Users, TrendingUp, FileText } from "lucide-react"

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { setMembership } = useAuthStore()

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
      setStep(3) // Go to success step
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
    // Allow user to skip org creation for now
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                ${step >= s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-500'}
              `}>
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card className="border-0 shadow-2xl shadow-indigo-100/50">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Welcome to PropFlow!</CardTitle>
              <CardDescription className="text-base mt-2">
                Let's set up your organisation to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-indigo-50 rounded-xl">
                    <Users className="h-6 w-6 mx-auto text-indigo-600 mb-2" />
                    <p className="text-sm font-medium">Manage Team</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                    <p className="text-sm font-medium">Track Leads</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <FileText className="h-6 w-6 mx-auto text-emerald-600 mb-2" />
                    <p className="text-sm font-medium">Invoices</p>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-12 text-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <button
                  onClick={handleSkip}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-0 shadow-2xl shadow-indigo-100/50">
            <CardHeader>
              <CardTitle>Create Your Organisation</CardTitle>
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
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                      placeholder="RERA/2025/0001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                    placeholder="Your office address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-11"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrgMutation.isPending}
                    className="flex-1 h-11 bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    {createOrgMutation.isPending ? "Creating..." : "Create Organisation"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-0 shadow-2xl shadow-indigo-100/50">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">You're All Set!</CardTitle>
              <CardDescription className="text-base mt-2">
                Your organisation has been created successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <p className="font-semibold text-green-800">{orgForm.name}</p>
                  <p className="text-sm text-green-600 capitalize">{orgForm.type}</p>
                </div>

                <div className="text-center text-sm text-gray-500 mb-4">
                  <p>Now you can:</p>
                  <ul className="mt-2 space-y-1">
                    <li>+ Add your first lead</li>
                    <li>+ Invite team members</li>
                    <li>+ Create cost sheets</li>
                  </ul>
                </div>

                <Button
                  onClick={() => navigate("/")}
                  className="w-full h-12 text-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
