import { Link } from "react-router-dom"
import { useSubscription } from "@/hooks/useSubscription"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  Zap, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Shield,
  CheckCircle,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Crown,
} from "lucide-react"

export function TrialDashboardWidget() {
  const { 
    subscription, 
    isOnTrial, 
    trialDaysRemaining, 
    urgencyLevel, 
    trialProgress,
    isTrialExpired,
    hasActiveSubscription,
    isLoading,
  } = useSubscription()

  // Don't show while loading or for paid users
  if (isLoading || !subscription || hasActiveSubscription) return null

  // Expired state
  if (isTrialExpired) {
    return (
      <div className="bg-zinc-900 rounded-3xl p-8 text-white flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <span className="text-lg font-semibold text-white">Trial Ended</span>
        </div>

        <h3 className="text-2xl md:text-3xl font-semibold text-white mb-2">
          Your trial has ended.
        </h3>
        <p className="text-zinc-400 mt-2 mb-6">
          Upgrade now to continue using PropFlow and keep all your data safe.
        </p>

        <div className="flex flex-wrap gap-3 text-sm text-zinc-300 mb-8">
          {[
            { icon: Users, label: "All contacts & leads" },
            { icon: BarChart3, label: "Reports & analytics" },
            { icon: Shield, label: "Data export" },
            { icon: TrendingUp, label: "Pipeline tracking" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-zinc-500" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <Link to="/settings/billing">
            <Button className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 h-11 text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!isOnTrial) return null

  const premiumFeatures = [
    { icon: Users, label: "Unlimited team members" },
    { icon: BarChart3, label: "Advanced analytics" },
    { icon: Shield, label: "Priority support" },
    { icon: TrendingUp, label: "Custom reports" },
  ]

  return (
    <div className="bg-zinc-900 rounded-3xl p-8 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
          {urgencyLevel >= 2 ? (
            <Clock className="h-5 w-5 text-amber-400" />
          ) : (
            <Crown className="h-5 w-5 text-white" />
          )}
        </div>
        <span className="text-lg font-semibold text-white">Free Trial</span>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          urgencyLevel >= 2
            ? "bg-amber-500/20 text-amber-400"
            : "bg-white/10 text-white"
        }`}>
          {trialDaysRemaining} days left
        </span>
      </div>

      <h3 className="text-2xl md:text-3xl font-semibold text-white mb-2">
        {urgencyLevel >= 3
          ? <>Trial ending soon,<br /><span className="text-zinc-400">don't lose your progress.</span></>
          : <>Explore PropFlow,<br /><span className="text-zinc-400">completely free.</span></>
        }
      </h3>

      {/* Progress bar */}
      <div className="mt-6 mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-zinc-400">Trial progress</span>
          <span className="font-medium text-white">{trialProgress}% used</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              urgencyLevel >= 2 ? "bg-amber-500" : "bg-white"
            }`}
            style={{ width: `${trialProgress}%` }}
          />
        </div>
      </div>

      {/* Premium features */}
      <div className="flex flex-wrap gap-3 text-sm text-zinc-300 mb-8">
        {premiumFeatures.map((feature, i) => (
          <div key={i} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-zinc-500" />
            <span>{feature.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-auto flex flex-col sm:flex-row gap-3">
        <Link to="/settings/billing">
          <Button className={`rounded-full px-6 h-11 text-sm font-medium ${
            urgencyLevel >= 2
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-white hover:bg-zinc-100 text-zinc-900"
          }`}>
            <Sparkles className="h-4 w-4 mr-2" />
            {urgencyLevel >= 2 ? "Upgrade Now" : "View Plans"}
          </Button>
        </Link>
        <Link to="/settings/billing">
          <Button variant="outline" className="rounded-full px-6 h-11 text-sm font-medium border-zinc-700 text-zinc-300 hover:bg-white/10 hover:text-white">
            Compare Plans
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// Compact version for sidebar or smaller spaces
export function TrialCompactWidget() {
  const { isOnTrial, trialDaysRemaining, urgencyLevel, hasActiveSubscription } = useSubscription()

  if (!isOnTrial || hasActiveSubscription) return null

  const bgColor = urgencyLevel >= 2 
    ? 'from-amber-500 to-orange-500' 
    : 'from-zinc-700 to-zinc-900'

  return (
    <Link to="/settings/billing">
      <div className={`bg-gradient-to-r ${bgColor} rounded-xl p-4 text-white group hover:shadow-lg transition-shadow`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left
              </p>
              <p className="text-xs text-white/70">in free trial</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

// Usage stats component showing limits
export function UsageStatsWidget() {
  const { subscription, isOnTrial, trialDaysRemaining, hasActiveSubscription } = useSubscription()

  if (hasActiveSubscription || !subscription?.usage) return null

  const usage = subscription.usage
  
  const usageItems = [
    { label: "Team Members", current: usage.users || 0, max: usage.max_users || 3 },
    { label: "Projects", current: usage.projects || 0, max: usage.max_projects || 5 },
  ]

  const isNearLimit = usageItems.some(item => (item.current / item.max) >= 0.8)

  return (
    <Card className={isNearLimit ? 'border-amber-200 bg-amber-50/50' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900">Plan Usage</h3>
          {isOnTrial && (
            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
              {trialDaysRemaining}d trial
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          {usageItems.map((item, i) => {
            const percentage = Math.round((item.current / item.max) * 100)
            const isHigh = percentage >= 80
            const isAtLimit = percentage >= 100
            
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-600">{item.label}</span>
                  <span className={`font-medium ${isAtLimit ? 'text-red-600' : isHigh ? 'text-amber-600' : 'text-zinc-900'}`}>
                    {item.current} / {item.max}
                  </span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isAtLimit ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {isNearLimit && (
          <Link to="/settings/billing" className="block mt-4">
            <Button variant="outline" size="sm" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100">
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade for more
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
