import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useSubscription } from "@/hooks/useSubscription"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Lock,
  CheckCircle,
  ArrowRight,
  Clock,
  AlertTriangle,
  Crown,
} from "lucide-react"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: "feature_limit" | "usage_limit" | "manual" | "scheduled"
  featureName?: string
}

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  trigger = "manual",
  featureName 
}: UpgradeModalProps) {
  const { trialDaysRemaining, urgencyLevel, isOnTrial, subscription } = useSubscription()

  // Different content based on trigger type
  const getContent = () => {
    switch (trigger) {
      case "feature_limit":
        return {
          title: "Premium Feature",
          subtitle: `${featureName || 'This feature'} requires an upgrade`,
          icon: Crown,
          iconBg: "from-purple-500 to-indigo-500",
          cta: "Unlock Now",
        }
      case "usage_limit":
        return {
          title: "Limit Reached",
          subtitle: "You've reached your plan's limit",
          icon: TrendingUp,
          iconBg: "from-amber-500 to-orange-500",
          cta: "Upgrade for More",
        }
      case "scheduled":
        return {
          title: "Special Offer",
          subtitle: "Limited time discount available",
          icon: Zap,
          iconBg: "from-emerald-500 to-teal-500",
          cta: "Claim Offer",
        }
      default:
        return {
          title: "Upgrade Your Plan",
          subtitle: "Unlock the full power of PropFlow",
          icon: Crown,
          iconBg: "from-zinc-700 to-zinc-900",
          cta: "View Plans",
        }
    }
  }

  const content = getContent()
  const IconComponent = content.icon

  const benefits = [
    { icon: Users, text: "Unlimited team members" },
    { icon: BarChart3, text: "Advanced analytics & reports" },
    { icon: Shield, text: "Priority support" },
    { icon: Lock, text: "Enterprise-grade security" },
  ]

  // Loss aversion messaging
  const getLossMessage = () => {
    if (!isOnTrial) return null
    
    if (trialDaysRemaining <= 3) {
      return {
        type: "urgent",
        message: `In ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}, you'll lose access to:`,
        losses: [
          "All your contacts and leads data",
          "Saved reports and templates",
          "Team collaboration features",
          "Email integrations and automations",
        ],
      }
    }
    
    return null
  }

  const lossMessage = getLossMessage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${content.iconBg} p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{content.title}</DialogTitle>
              <p className="text-sm text-white/80">{content.subtitle}</p>
            </div>
          </div>
          
          {/* Trial countdown */}
          {isOnTrial && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg flex items-center gap-3">
              <Clock className="h-5 w-5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in trial
                </p>
              </div>
              {urgencyLevel >= 2 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                  Ending Soon
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Loss aversion section */}
          {lossMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm mb-2">
                    {lossMessage.message}
                  </p>
                  <ul className="space-y-1.5">
                    {lossMessage.losses.map((loss, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        {loss}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div>
            <p className="text-sm font-semibold text-zinc-900 mb-3">
              What you get with Pro:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <benefit.icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm text-zinc-700">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="bg-zinc-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 border-2 border-white"
                  />
                ))}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900">2,400+ teams trust PropFlow</p>
                <p className="text-xs text-zinc-500">Join them today</p>
              </div>
            </div>
          </div>

          {/* Pricing teaser */}
          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-1">Starting at</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-zinc-900">₹999</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Save 20% with annual billing</p>
          </div>

          {/* CTAs */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
            <Link to="/settings/billing" className="flex-1">
              <Button className="w-full bg-zinc-900 hover:bg-zinc-800">
                {content.cta}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage upgrade modal state globally
export function useUpgradeModal() {
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState<UpgradeModalProps["trigger"]>("manual")
  const [featureName, setFeatureName] = useState<string>()

  const showUpgradeModal = (opts?: { trigger?: UpgradeModalProps["trigger"]; featureName?: string }) => {
    setTrigger(opts?.trigger || "manual")
    setFeatureName(opts?.featureName)
    setOpen(true)
  }

  const hideUpgradeModal = () => setOpen(false)

  return {
    upgradeModalOpen: open,
    upgradeModalTrigger: trigger,
    upgradeModalFeatureName: featureName,
    showUpgradeModal,
    hideUpgradeModal,
    setUpgradeModalOpen: setOpen,
  }
}

// Feature gate component - wraps premium features
interface FeatureGateProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature } = useSubscription()
  const [showModal, setShowModal] = useState(false)

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  return (
    <>
      <div 
        className="relative cursor-pointer group"
        onClick={() => setShowModal(true)}
      >
        <div className="absolute inset-0 bg-zinc-50/80 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg border border-dashed border-zinc-300">
          <div className="text-center p-4">
            <Lock className="h-5 w-5 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-700">Premium Feature</p>
            <p className="text-xs text-zinc-500 mt-1">Click to upgrade</p>
          </div>
        </div>
        <div className="opacity-50 pointer-events-none">
          {fallback || children}
        </div>
      </div>
      
      <UpgradeModal 
        open={showModal} 
        onOpenChange={setShowModal}
        trigger="feature_limit"
        featureName={feature}
      />
    </>
  )
}

// Usage limit warning component
interface UsageLimitWarningProps {
  current: number
  max: number
  label: string
}

export function UsageLimitWarning({ current, max, label }: UsageLimitWarningProps) {
  const percentage = (current / max) * 100
  const { isOnTrial } = useSubscription()
  const [showModal, setShowModal] = useState(false)

  if (percentage < 80) return null

  const isAtLimit = percentage >= 100

  return (
    <>
      <div 
        className={`
          p-3 rounded-lg flex items-center gap-3 cursor-pointer
          ${isAtLimit 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-amber-50 border border-amber-200'
          }
        `}
        onClick={() => setShowModal(true)}
      >
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center
          ${isAtLimit ? 'bg-red-100' : 'bg-amber-100'}
        `}>
          {isAtLimit 
            ? <AlertTriangle className="h-4 w-4 text-red-500" />
            : <TrendingUp className="h-4 w-4 text-amber-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isAtLimit ? 'text-red-800' : 'text-amber-800'}`}>
            {isAtLimit 
              ? `${label} limit reached` 
              : `${percentage.toFixed(0)}% of ${label} limit used`
            }
          </p>
          <p className={`text-xs ${isAtLimit ? 'text-red-600' : 'text-amber-600'}`}>
            {current} of {max} used
          </p>
        </div>
        <Button 
          size="sm" 
          variant={isAtLimit ? "destructive" : "outline"}
          className={!isAtLimit ? 'border-amber-300 text-amber-700 hover:bg-amber-100' : ''}
        >
          Upgrade
        </Button>
      </div>

      <UpgradeModal 
        open={showModal} 
        onOpenChange={setShowModal}
        trigger="usage_limit"
        featureName={label}
      />
    </>
  )
}
