import { Link } from "react-router-dom"
import { useSubscription } from "@/hooks/useSubscription"
import { Clock, Zap, AlertTriangle, X, Sparkles, TrendingUp } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export function TrialBanner() {
  const { 
    subscription, 
    isOnTrial, 
    trialDaysRemaining, 
    urgencyLevel, 
    isTrialExpired,
    hasActiveSubscription,
    trialProgress,
    isLoading,
  } = useSubscription()
  
  const [dismissed, setDismissed] = useState(false)
  const [showPulse, setShowPulse] = useState(false)

  // Pulse animation every 30 seconds for high urgency
  useEffect(() => {
    if (urgencyLevel === 3) {
      const interval = setInterval(() => {
        setShowPulse(true)
        setTimeout(() => setShowPulse(false), 1000)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [urgencyLevel])

  // Don't show while loading or for paid users
  if (isLoading || !subscription || hasActiveSubscription || dismissed) return null

  // Trial expired - critical banner
  if (isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Your free trial has ended</p>
                <p className="text-sm text-red-100">Upgrade now to continue using PropFlow</p>
              </div>
            </div>
            <Link to="/settings/billing">
              <Button className="bg-white text-red-600 hover:bg-red-50 font-semibold shadow-lg">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isOnTrial) return null

  // Dynamic styling based on urgency
  const getBannerStyle = () => {
    switch (urgencyLevel) {
      case 3: // High urgency (< 3 days)
        return {
          bg: "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500",
          text: "text-white",
          subtext: "text-amber-100",
          icon: AlertTriangle,
          message: trialDaysRemaining === 1 
            ? "Last day of your free trial!" 
            : `Only ${trialDaysRemaining} days left in your trial!`,
          submessage: "Don't lose your data - upgrade now",
        }
      case 2: // Medium urgency (3-7 days)
        return {
          bg: "bg-gradient-to-r from-amber-400 to-orange-500",
          text: "text-white",
          subtext: "text-amber-100",
          icon: Clock,
          message: `${trialDaysRemaining} days left in your free trial`,
          submessage: "Upgrade to unlock all features",
        }
      default: // Low urgency (> 7 days)
        return {
          bg: "bg-gradient-to-r from-zinc-800 to-zinc-900",
          text: "text-white",
          subtext: "text-zinc-300",
          icon: Sparkles,
          message: `${trialDaysRemaining} days left in your free trial`,
          submessage: "Explore all premium features",
        }
    }
  }

  const style = getBannerStyle()
  const IconComponent = style.icon

  return (
    <div className={`${style.bg} ${style.text} ${showPulse ? 'animate-pulse' : ''}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <IconComponent className="h-4 w-4" />
            </div>
            
            {/* Trial Progress Bar */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-xs">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/80 rounded-full transition-all duration-500"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{trialProgress}% used</span>
            </div>
            
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{style.message}</p>
              <p className={`text-xs ${style.subtext} hidden sm:block`}>{style.submessage}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/settings/billing">
              <Button 
                size="sm"
                className={`
                  font-semibold shadow-lg transition-transform hover:scale-105
                  ${urgencyLevel >= 2 
                    ? 'bg-white text-orange-600 hover:bg-orange-50' 
                    : 'bg-white text-zinc-900 hover:bg-zinc-100'
                  }
                `}
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                Upgrade
              </Button>
            </Link>
            {urgencyLevel < 2 && (
              <button 
                onClick={() => setDismissed(true)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Floating upgrade nudge that appears periodically
export function UpgradeNudge() {
  const { isOnTrial, urgencyLevel, trialDaysRemaining, isLoading } = useSubscription()
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isLoading || !isOnTrial || dismissed) return

    // Show nudge based on urgency
    const showDelay = urgencyLevel >= 2 ? 60000 : 180000 // 1min for urgent, 3min otherwise
    
    const timeout = setTimeout(() => {
      setVisible(true)
    }, showDelay)

    return () => clearTimeout(timeout)
  }, [isLoading, isOnTrial, urgencyLevel, dismissed])

  if (!visible || !isOnTrial) return null

  const messages = [
    "You're making great progress! Upgrade to keep all your work safe.",
    "Your team is growing! Consider upgrading for more seats.",
    "Unlock advanced reports and analytics with an upgrade.",
    "Love PropFlow? Get 20% off your first year!",
  ]

  const randomMessage = messages[Math.floor(Math.random() * messages.length)]

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 max-w-sm">
        <button 
          onClick={() => {
            setVisible(false)
            setDismissed(true)
          }}
          className="absolute top-3 right-3 p-1 hover:bg-zinc-100 rounded-full"
        >
          <X className="h-4 w-4 text-zinc-400" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-zinc-900 mb-1">
              {trialDaysRemaining} days left
            </p>
            <p className="text-sm text-zinc-500 mb-3">{randomMessage}</p>
            <div className="flex gap-2">
              <Link to="/settings/billing" className="flex-1">
                <Button size="sm" className="w-full bg-zinc-900 hover:bg-zinc-800">
                  View Plans
                </Button>
              </Link>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setVisible(false)
                  setDismissed(true)
                }}
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
