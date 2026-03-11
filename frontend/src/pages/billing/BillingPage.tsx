import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { billingApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Check, Clock, AlertTriangle, Receipt, ArrowRight, Shield } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function BillingPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly")

  // Fetch subscription
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => billingApi.getSubscription().then((r) => r.data),
  })

  // Fetch plans
  const { data: plansData } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => billingApi.getPlans().then((r) => r.data),
  })

  // Fetch payment history
  const { data: paymentHistory } = useQuery({
    queryKey: ["payment-history"],
    queryFn: () => billingApi.getPaymentHistory().then((r) => r.data),
  })

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: ({ plan, cycle }: { plan: string; cycle: string }) =>
      billingApi.createOrder(plan, cycle).then((r) => r.data),
    onSuccess: (order) => {
      if (order.mock) {
        verifyPaymentMutation.mutate({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "mock_signature",
          plan: order.plan,
          billing_cycle: order.billing_cycle,
        })
        return
      }

      const options = {
        key: order.razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: "PropFlow CRM",
        description: `${order.plan} Plan - ${order.billing_cycle}`,
        order_id: order.order_id,
        handler: function (response: any) {
          verifyPaymentMutation.mutate({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan: order.plan,
            billing_cycle: order.billing_cycle,
          })
        },
        prefill: { email: "" },
        theme: { color: "#18181b" },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", function (response: any) {
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: response.error.description,
        })
      })
      rzp.open()
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create order" })
    },
  })

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: (data: any) => billingApi.verifyPayment(data).then((r) => r.data),
    onSuccess: (result) => {
      toast({ title: "Subscription activated!", description: result.message })
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
      queryClient.invalidateQueries({ queryKey: ["payment-history"] })
      setSelectedPlan(null)
    },
    onError: () => {
      toast({ variant: "destructive", title: "Payment verification failed" })
    },
  })

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancelSubscription().then((r) => r.data),
    onSuccess: () => {
      toast({ title: "Subscription will be canceled at the end of the billing period" })
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
    },
  })

  const isCurrentPlan = (planId: string) => subscription?.plan === planId

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId)
    createOrderMutation.mutate({ plan: planId, cycle: billingCycle })
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)

  const UpgradeButton = ({ planId, variant = "dark" }: { planId: string; variant?: "dark" | "light" }) => {
    const loading = createOrderMutation.isPending && selectedPlan === planId
    if (isCurrentPlan(planId)) {
      return (
        <Button disabled variant="outline" className="rounded-full px-6 h-11 text-sm font-medium opacity-60">
          Current Plan
        </Button>
      )
    }
    return (
      <Button
        onClick={() => handleUpgrade(planId)}
        disabled={loading}
        className={`rounded-full px-6 h-11 text-sm font-medium ${
          variant === "dark"
            ? "bg-zinc-900 hover:bg-zinc-800 text-white"
            : "bg-white hover:bg-zinc-100 text-zinc-900"
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            Processing...
          </>
        ) : (
          <>
            {subscription?.status === "trialing" ? "Start Plan" : "Upgrade"}{" "}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    )
  }

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Current Subscription Status */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Your Subscription</h2>
            <p className="text-sm text-zinc-500">Manage your plan and billing details</p>
          </div>
          <Badge
            className={`text-sm px-3 py-1.5 w-fit ${
              subscription?.status === "trialing"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : subscription?.status === "active"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-zinc-100 text-zinc-700 border-zinc-200"
            }`}
          >
            {subscription?.status === "trialing" ? (
              <>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Free Trial
              </>
            ) : subscription?.status === "active" ? (
              <>
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Active
              </>
            ) : (
              <span className="capitalize">{subscription?.status}</span>
            )}
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-1">Plan</p>
            <p className="text-xl font-bold text-zinc-900">{subscription?.plan_name}</p>
          </div>
          {subscription?.status === "trialing" && subscription?.trial_ends_at && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-xs uppercase tracking-wider text-amber-600 mb-1">Trial Ends</p>
              <p className="text-xl font-bold text-amber-700">
                {formatDistanceToNow(new Date(subscription.trial_ends_at), { addSuffix: true })}
              </p>
            </div>
          )}
          {subscription?.current_period_end && subscription?.status === "active" && (
            <div className="bg-zinc-50 rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400 mb-1">Next Billing</p>
              <p className="text-xl font-bold text-zinc-900">
                {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
              </p>
            </div>
          )}
          <div className="bg-zinc-50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-1">Team Size</p>
            <p className="text-xl font-bold text-zinc-900">
              {subscription?.usage?.users}{" "}
              <span className="text-zinc-400 font-normal text-base">
                / {subscription?.usage?.max_users === -1 ? "∞" : subscription?.usage?.max_users}
              </span>
            </p>
          </div>
          <div className="bg-zinc-50 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-1">Projects</p>
            <p className="text-xl font-bold text-zinc-900">
              {subscription?.usage?.projects}{" "}
              <span className="text-zinc-400 font-normal text-base">
                / {subscription?.usage?.max_projects === -1 ? "∞" : subscription?.usage?.max_projects}
              </span>
            </p>
          </div>
        </div>

        {subscription?.cancel_at_period_end && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Your subscription will be canceled at the end of the current billing period.
            </p>
          </div>
        )}

        {subscription?.status === "active" && !subscription?.cancel_at_period_end && (
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="text-zinc-500 hover:text-red-600 hover:border-red-200"
            >
              Cancel Subscription
            </Button>
          </div>
        )}
      </div>

      {/* Pricing Header */}
      <div>
        <h2 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
          Plans &<br />
          <span className="font-semibold">Pricing</span>
        </h2>
      </div>

      {/* Main Plans - Two Column (Starter + Growth) */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Starter Plan - Light Card */}
        <div className={`bg-white rounded-3xl p-8 border ${isCurrentPlan("starter") ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200"} relative`}>
          {isCurrentPlan("starter") && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-zinc-900 text-white text-xs font-medium rounded-full">
                Current
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <span className="text-lg font-semibold text-zinc-900">Starter</span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              14-day free trial
            </span>
          </div>

          <h3 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-2">
            Perfect for small teams<br />getting started.
          </h3>

          <div className="flex items-baseline gap-2 mt-8 mb-6">
            <span className="text-sm text-zinc-500">₹</span>
            <span className="text-4xl font-bold text-zinc-900">
              {billingCycle === "yearly" ? "799" : "999"}
            </span>
            <span className="text-zinc-500">/user/mo</span>
          </div>

          <UpgradeButton planId="starter" variant="dark" />

          {/* Testimonial */}
          <div className="mt-8 pt-6 border-t border-zinc-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              RK
            </div>
            <div>
              <p className="text-sm text-zinc-600 italic">"PropFlow helped us close 40% more deals in Q1."</p>
              <p className="text-xs text-zinc-400 mt-1">Rajesh Kumar, Sales Head</p>
            </div>
          </div>

          {/* Features - Two Column */}
          <div className="mt-8 pt-6 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-zinc-600">
              {["Up to 5 users", "2 projects", "Lead management", "Pipeline tracking", "Task management", "Email support"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-zinc-400" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Growth Plan - Dark Card */}
        <div className={`bg-zinc-900 rounded-3xl p-8 text-white relative ${isCurrentPlan("growth") ? "ring-2 ring-amber-400" : ""}`}>
          {isCurrentPlan("growth") ? (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-white text-zinc-900 text-xs font-medium rounded-full">
                Current
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg font-semibold text-white">Growth</span>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                Most Popular
              </span>
            </div>
          )}
          {isCurrentPlan("growth") && (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg font-semibold text-white">Growth</span>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                Most Popular
              </span>
            </div>
          )}

          <h3 className="text-2xl md:text-3xl font-semibold text-white mb-2">
            For teams ready to go<br />
            <span className="text-zinc-400">zero to one & beyond.</span>
          </h3>

          <div className="flex items-baseline gap-2 mt-8 mb-6">
            <span className="text-sm text-zinc-400">₹</span>
            <span className="text-4xl font-bold text-white">
              {billingCycle === "yearly" ? "639" : "799"}
            </span>
            <span className="text-zinc-400">/user/mo</span>
          </div>

          <UpgradeButton planId="growth" variant="light" />

          {/* Testimonial */}
          <div className="mt-8 pt-6 border-t border-zinc-800 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-zinc-900 text-sm font-medium flex-shrink-0">
              PS
            </div>
            <div>
              <p className="text-sm text-zinc-300 italic">"The inventory tracking alone saved us countless hours."</p>
              <p className="text-xs text-zinc-500 mt-1">Priya Sharma, COO</p>
            </div>
          </div>

          {/* Features - Two Column */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-zinc-300">
              {["Up to 20 users", "10 projects", "Finance module", "Custom reports", "Site visits", "Priority support"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-zinc-500" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scale Plan - Full Width */}
      <div className={`bg-white rounded-3xl p-8 border ${isCurrentPlan("scale") ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200"} relative`}>
        {isCurrentPlan("scale") && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 bg-zinc-900 text-white text-xs font-medium rounded-full">
              Current
            </span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg font-semibold text-zinc-900">Scale</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Unlimited projects
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-2">
              Great for those who want<br />
              <span className="font-light">quality + speed.</span>
            </h3>

            {/* Features - Inline */}
            <div className="flex flex-wrap gap-4 mt-6 text-sm text-zinc-600">
              {["Up to 50 users", "API access", "Advanced analytics", "Audit logs", "Dedicated support"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-zinc-400" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-sm text-zinc-500">₹</span>
                <span className="text-4xl font-bold text-zinc-900">
                  {billingCycle === "yearly" ? "519" : "649"}
                </span>
                <span className="text-zinc-500">/user/mo</span>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Best value for growing teams</p>
            </div>
            <UpgradeButton planId="scale" variant="dark" />
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`text-sm font-medium transition-colors ${
            billingCycle === "monthly" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Monthly
        </button>
        <div
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
          className="relative w-12 h-6 bg-zinc-200 rounded-full cursor-pointer transition-colors"
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-zinc-900 rounded-full transition-all duration-300 ${
              billingCycle === "yearly" ? "left-7" : "left-1"
            }`}
          />
        </div>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`text-sm font-medium transition-colors flex items-center gap-2 ${
            billingCycle === "yearly" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Yearly
          {billingCycle === "yearly" && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              Save 20%
            </span>
          )}
        </button>
      </div>

      {/* Enterprise CTA */}
      <div className="text-center">
        <p className="text-zinc-500 text-sm mb-2">Need a custom solution for your enterprise?</p>
        <button className="text-zinc-900 font-medium text-sm underline underline-offset-4 hover:text-zinc-700">
          Contact our sales team →
        </button>
      </div>

      {/* 30-Day Guarantee */}
      <div className="bg-zinc-900 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">30-Day Money Back Guarantee</h3>
            <p className="text-zinc-400 text-sm">Not satisfied? Get a full refund within 30 days, no questions asked.</p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {paymentHistory?.data?.length > 0 && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Payment History</h3>
                <p className="text-sm text-zinc-500">Your recent transactions and invoices</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-100 bg-zinc-50/50">
                <tr>
                  <th className="text-left px-8 py-3 text-xs uppercase tracking-wider font-medium text-zinc-400">Date</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium text-zinc-400">Plan</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium text-zinc-400">Amount</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium text-zinc-400">Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium text-zinc-400">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paymentHistory.data.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-8 py-4 text-sm font-medium text-zinc-900">
                      {payment.created_at ? format(new Date(payment.created_at), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium capitalize text-zinc-700">{payment.plan}</td>
                    <td className="px-4 py-4 text-sm font-bold text-zinc-900">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-4">
                      <Badge
                        className={`${
                          payment.status === "captured"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {payment.status === "captured" ? "Paid" : payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-zinc-500">
                      {payment.billing_period_start && payment.billing_period_end
                        ? `${format(new Date(payment.billing_period_start), "MMM d")} - ${format(
                            new Date(payment.billing_period_end),
                            "MMM d, yyyy"
                          )}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
