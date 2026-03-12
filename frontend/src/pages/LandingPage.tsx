import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/app/store"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Building2,
  Check,
  ArrowRight,
  Zap,
  Rocket,
  Crown,
  Sparkles,
  Shield,
  Users,
  BarChart3,
  Kanban,
  Calendar,
  CreditCard,
  ChevronRight,
  Play,
  Star,
  Quote,
} from "lucide-react"

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small teams getting started",
    price_monthly: 999,
    price_yearly: 9599,
    max_users: 5,
    max_projects: 2,
    icon: Zap,
    gradient: "from-zinc-500 to-zinc-700",
    bg: "bg-gradient-to-br from-zinc-50 to-zinc-100",
    features: [
      "Up to 5 users",
      "2 projects",
      "Lead management",
      "Contact management",
      "Pipeline tracking",
      "Task management",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing teams with more needs",
    price_monthly: 799,
    price_yearly: 7670,
    max_users: 20,
    max_projects: 10,
    icon: Rocket,
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    popular: true,
    features: [
      "Up to 20 users",
      "10 projects",
      "Everything in Starter",
      "Finance module",
      "Custom reports",
      "Site visit scheduling",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    description: "For large teams with complex needs",
    price_monthly: 649,
    price_yearly: 6230,
    max_users: 50,
    max_projects: -1,
    icon: Building2,
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    features: [
      "Up to 50 users",
      "Unlimited projects",
      "Everything in Growth",
      "API access",
      "Advanced analytics",
      "Audit logs",
      "Dedicated support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    price_monthly: 0,
    price_yearly: 0,
    max_users: -1,
    max_projects: -1,
    icon: Crown,
    gradient: "from-purple-500 to-violet-700",
    bg: "bg-gradient-to-br from-purple-50 to-violet-50",
    features: [
      "Unlimited users",
      "Unlimited projects",
      "Everything in Scale",
      "White labeling",
      "Custom integrations",
      "SLA guarantee",
      "24/7 support",
    ],
  },
]

const FEATURES = [
  {
    icon: Users,
    title: "Lead Management",
    description: "Capture, track, and nurture leads from multiple sources in one place.",
  },
  {
    icon: Kanban,
    title: "Visual Pipeline",
    description: "Drag-and-drop kanban boards to track deals through every stage.",
  },
  {
    icon: Building2,
    title: "Inventory Management",
    description: "Track units, towers, and availability in real-time.",
  },
  {
    icon: Calendar,
    title: "Site Visits",
    description: "Schedule and manage site visits with automated reminders.",
  },
  {
    icon: CreditCard,
    title: "Finance Module",
    description: "Generate quotations, invoices, and track payments seamlessly.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Custom reports and dashboards to track performance.",
  },
]

const TESTIMONIALS = [
  {
    name: "Rajesh Kumar",
    role: "Director, Skyline Developers",
    content: "PropFlow has transformed how we manage our sales pipeline. We've seen a 40% increase in conversions.",
    avatar: "RK",
  },
  {
    name: "Priya Sharma",
    role: "Sales Head, Urban Homes",
    content: "The inventory management feature alone has saved us countless hours. Highly recommended!",
    avatar: "PS",
  },
  {
    name: "Amit Patel",
    role: "CEO, Greenfield Realty",
    content: "Finally a CRM built for Indian real estate. The portal integrations are a game-changer.",
    avatar: "AP",
  },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly")

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F7F5F2]/90 backdrop-blur-md border-b border-zinc-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-zinc-900">PropFlow</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                Testimonials
              </a>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-full px-5">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="font-medium text-zinc-600 hover:text-zinc-900">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-full px-5">
                      Start Free Trial
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-[#F7F5F2]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white text-zinc-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-zinc-200">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>14-Day Free Trial</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-light text-zinc-900 mb-6 leading-tight">
                The CRM built for<br />
                <span className="font-semibold">Indian Real Estate</span>
              </h1>
              <p className="text-lg text-zinc-600 mb-10 max-w-lg">
                Manage leads, track inventory, close deals faster. Everything you need to scale your real estate business.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link to="/signup">
                  <Button size="lg" className="bg-zinc-900 hover:bg-zinc-800 text-white h-12 px-8 text-base font-medium rounded-full">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium rounded-full border-zinc-300">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              <p className="mt-8 text-sm text-zinc-500">
                Trusted by 500+ real estate companies across India
              </p>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="bg-zinc-900 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="aspect-[4/3] bg-zinc-800 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Building2 className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-500">Dashboard Preview</p>
                  </div>
                </div>
              </div>
              {/* Floating Stats Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl border border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-900">40%</p>
                    <p className="text-xs text-zinc-500">More Conversions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl md:text-6xl font-light text-zinc-900 leading-tight">
              Everything you need to<br />
              <span className="font-semibold">close more deals</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <div
                key={feature.title}
                className={`rounded-3xl p-8 ${
                  idx === 0 ? "bg-zinc-900 text-white" : "bg-[#F7F5F2]"
                }`}
              >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 ${
                  idx === 0 ? "bg-white/10" : "bg-white"
                }`}>
                  <feature.icon className={`h-6 w-6 ${idx === 0 ? "text-white" : "text-zinc-900"}`} />
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${idx === 0 ? "text-white" : "text-zinc-900"}`}>
                  {feature.title}
                </h3>
                <p className={idx === 0 ? "text-zinc-300" : "text-zinc-600"}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F5F2]">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-16">
            <h2 className="text-5xl md:text-6xl font-light text-zinc-900 leading-tight">
              Plans &<br />
              <span className="font-semibold">Pricing</span>
            </h2>
          </div>

          {/* Main Plans - Two Column */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Starter Plan - Light Card */}
            <div className="bg-white rounded-3xl p-8 border border-zinc-200 relative">
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

              <Link to="/signup">
                <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 h-11 text-sm font-medium">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

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
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Up to 5 users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>2 projects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Lead management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Pipeline tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Task management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Email support</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Plan - Dark Card */}
            <div className="bg-zinc-900 rounded-3xl p-8 text-white relative">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-lg font-semibold text-white">Growth</span>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                  Most Popular
                </span>
              </div>

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

              <Link to="/signup">
                <Button className="bg-white hover:bg-zinc-100 text-zinc-900 rounded-full px-6 h-11 text-sm font-medium">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

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
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>Up to 20 users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>10 projects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>Finance module</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>Custom reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>Site visits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>Priority support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scale Plan - Full Width Bottom */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-200">
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
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Up to 50 users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>API access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Audit logs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-400" />
                    <span>Dedicated support</span>
                  </div>
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
                <Link to="/signup">
                  <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 h-11 text-sm font-medium">
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-12">
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
          <div className="mt-12 text-center">
            <p className="text-zinc-500 text-sm mb-2">Need a custom solution for your enterprise?</p>
            <Link to="/signup" className="text-zinc-900 font-medium text-sm underline underline-offset-4 hover:text-zinc-700">
              Contact our sales team →
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl md:text-6xl font-light text-zinc-900 leading-tight">
              What our<br />
              <span className="font-semibold">clients say</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, idx) => (
              <div
                key={testimonial.name}
                className={`rounded-3xl p-8 ${
                  idx === 1 ? "bg-zinc-900 text-white" : "bg-[#F7F5F2]"
                }`}
              >
                <Quote className={`h-8 w-8 mb-4 ${idx === 1 ? "text-zinc-600" : "text-zinc-300"}`} />
                <p className={`text-lg mb-8 leading-relaxed ${idx === 1 ? "text-zinc-100" : "text-zinc-700"}`}>
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold ${
                    idx === 1 ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"
                  }`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className={`font-semibold ${idx === 1 ? "text-white" : "text-zinc-900"}`}>
                      {testimonial.name}
                    </p>
                    <p className={`text-sm ${idx === 1 ? "text-zinc-400" : "text-zinc-500"}`}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Get Started - Light Card */}
            <div className="bg-[#F7F5F2] rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-zinc-900" />
                  </div>
                  <span className="text-lg font-semibold text-zinc-900">Get Started</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-2">
                  Ready to transform<br />your sales?
                </h3>
                <p className="text-zinc-600 mt-4 mb-8">
                  Join 500+ real estate companies already using PropFlow to close more deals, faster.
                </p>
              </div>
              <div>
                <Link to="/signup">
                  <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 h-11 text-sm font-medium">
                    Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <p className="mt-4 text-sm text-zinc-500">No credit card required</p>
              </div>
            </div>

            {/* 14-Day Trial - Dark Card */}
            <div className="bg-zinc-900 rounded-3xl p-8 text-white flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-lg font-semibold text-white">Free Trial</span>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                    14 Days
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold text-white mb-2">
                  14 days of PropFlow,<br />
                  <span className="text-zinc-400">completely free.</span>
                </h3>
                <p className="text-zinc-400 mt-4 mb-8">
                  Full access to all features. Set up your team, import leads, and start closing deals today.
                </p>
              </div>
              <div>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-300 mb-6">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>All features included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-zinc-500" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
                <Link to="/signup">
                  <Button className="bg-white hover:bg-zinc-100 text-zinc-900 rounded-full px-6 h-11 text-sm font-medium">
                    Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                <Building2 className="h-4 w-4 text-zinc-900" />
              </div>
              <span className="text-lg font-semibold text-white">PropFlow</span>
            </div>
            <p className="text-sm text-zinc-500">© 2026 PropFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
