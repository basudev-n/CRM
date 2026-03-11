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
      <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800">Your trial has ended</h3>
                <p className="text-sm text-red-600 mt-1">
                  Upgrade now to continue using PropFlow and keep all your data safe.
                </p>
                
                <div className="mt-4 p-4 bg-white/60 rounded-xl">
                  <p className="text-sm font-medium text-zinc-700 mb-2">You're about to lose access to:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Users, label: "All contacts & leads" },
                      { icon: BarChart3, label: "Reports & analytics" },
                      { icon: Shield, label: "Data export" },
                      { icon: TrendingUp, label: "Pipeline tracking" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-red-700">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link to="/settings/billing" className="block mt-4">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade Now to Keep Your Data
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isOnTrial) return null

  // Dynamic styling based on urgency
  const getWidgetStyle = () => {
    switch (urgencyLevel) {
      case 3: // High urgency (< 3 days)
        return {
          border: "border-2 border-orange-300",
          bg: "bg-gradient-to-br from-amber-50 via-orange-50 to-red-50",
          iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
          progressBg: "bg-orange-200",
          progressFill: "bg-gradient-to-r from-amber-500 to-orange-500",
          title: "Your trial is ending soon!",
          subtitle: "Don't lose your progress",
        }
      case 2: // Medium urgency (3-7 days)
        return {
          border: "border border-amber-200",
          bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
          iconBg: "bg-gradient-to-br from-amber-400 to-yellow-500",
          progressBg: "bg-amber-200",
          progressFill: "bg-amber-500",
          title: `${trialDaysRemaining} days left in your trial`,
          subtitle: "Explore premium features",
        }
      default: // Low urgency (> 7 days)
        return {
          border: "border border-zinc-200",
          bg: "bg-gradient-to-br from-zinc-50 to-slate-50",
          iconBg: "bg-gradient-to-br from-zinc-700 to-zinc-900",
          progressBg: "bg-zinc-200",
          progressFill: "bg-zinc-700",
          title: `${trialDaysRemaining} days of free trial remaining`,
          subtitle: "Take your time to explore",
        }
    }
  }

  const style = getWidgetStyle()

  const premiumFeatures = [
    { icon: Users, label: "Unlimited team members" },
    { icon: BarChart3, label: "Advanced analytics" },
    { icon: Shield, label: "Priority support" },
    { icon: TrendingUp, label: "Custom reports" },
  ]

  return (
    <Card className={`${style.border} ${style.bg} shadow-lg overflow-hidden`}>
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl ${style.iconBg} flex items-center justify-center flex-shrink-0 text-white`}>
                {urgencyLevel >= 2 ? (
                  <Clock className="h-6 w-6" />
                ) : (
                  <Crown className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{style.title}</h3>
                <p className="text-sm text-zinc-500 mt-0.5">{style.subtitle}</p>
              </div>
            </div>
            
            <div className="text-right hidden sm:block">
              <div className="text-3xl font-bold text-zinc-900">{trialDaysRemaining}</div>
              <div className="text-xs text-zinc-500">days left</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-zinc-500">Trial progress</span>
              <span className="font-medium text-zinc-700">{trialProgress}% used</span>
            </div>
            <div className={`h-2 rounded-full ${style.progressBg} overflow-hidden`}>
              <div 
                className={`h-full ${style.progressFill} rounded-full transition-all duration-500`}
                style={{ width: `${trialProgress}%` }}
              />
            </div>
          </div>

          {/* Premium features */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {premiumFeatures.map((feature, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2 text-sm text-zinc-600 bg-white/50 rounded-lg px-3 py-2"
              >
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>{feature.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link to="/settings/billing" className="flex-1">
              <Button 
                className={`w-full ${
                  urgencyLevel >= 2 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' 
                    : 'bg-zinc-900 hover:bg-zinc-800'
                } text-white`}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {urgencyLevel >= 2 ? 'Upgrade Now' : 'View Plans'}
              </Button>
            </Link>
            <Link to="/settings/billing" className="sm:w-auto">
              <Button variant="outline" className="w-full">
                Compare Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          {urgencyLevel >= 2 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-white/60 rounded-xl">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 border-2 border-white"
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-600">
                <span className="font-medium">2,400+ teams</span> upgraded this month
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
