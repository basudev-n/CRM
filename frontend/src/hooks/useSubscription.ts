import { useQuery } from "@tanstack/react-query"
import { billingApi } from "@/services/api"
import { useAuthStore } from "@/app/store"

export interface Subscription {
  plan: string
  plan_name: string
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired"
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  usage: {
    users: number
    max_users: number
    projects: number
    max_projects: number
  }
  features: string[]
}

export function useSubscription() {
  const { isAuthenticated, membership } = useAuthStore()

  const query = useQuery<Subscription | null>({
    queryKey: ["subscription"],
    queryFn: async () => {
      try {
        const response = await billingApi.getSubscription()
        return response.data
      } catch (error) {
        console.error("Failed to fetch subscription:", error)
        return null
      }
    },
    enabled: isAuthenticated && !!membership,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  })

  const subscription = query.data

  // Calculate trial days remaining
  const getTrialDaysRemaining = (): number => {
    if (!subscription?.trial_ends_at) return 0
    if (subscription.status !== "trialing") return 0
    
    const trialEnd = new Date(subscription.trial_ends_at)
    const now = new Date()
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  // Check if trial is ending soon (3 days or less)
  const isTrialEndingSoon = (): boolean => {
    const days = getTrialDaysRemaining()
    return subscription?.status === "trialing" && days <= 3 && days > 0
  }

  // Check if trial has expired
  const isTrialExpired = (): boolean => {
    if (subscription?.status === "trialing") {
      return getTrialDaysRemaining() === 0
    }
    return subscription?.status === "expired"
  }

  // Check if user is on trial
  const isOnTrial = (): boolean => {
    return subscription?.status === "trialing" && getTrialDaysRemaining() > 0
  }

  // Check if user has active paid subscription
  const hasActiveSubscription = (): boolean => {
    return subscription?.status === "active"
  }

  // Get urgency level for UI styling (0-3)
  // 0 = no urgency, 1 = low (>7 days), 2 = medium (3-7 days), 3 = high (<3 days)
  const getUrgencyLevel = (): 0 | 1 | 2 | 3 => {
    if (!isOnTrial()) return 0
    const days = getTrialDaysRemaining()
    if (days > 7) return 1
    if (days > 3) return 2
    return 3
  }

  // Get percentage of trial used
  const getTrialProgress = (): number => {
    const totalDays = 14 // Assuming 14-day trial
    const remaining = getTrialDaysRemaining()
    return Math.round(((totalDays - remaining) / totalDays) * 100)
  }

  // Check if a feature is available
  const hasFeature = (feature: string): boolean => {
    return subscription?.features?.includes(feature) ?? false
  }

  // Check usage limits
  const isNearUserLimit = (): boolean => {
    if (!subscription) return false
    const { users, max_users } = subscription.usage
    if (max_users === -1) return false // Unlimited
    return users >= max_users * 0.8
  }

  const isNearProjectLimit = (): boolean => {
    if (!subscription) return false
    const { projects, max_projects } = subscription.usage
    if (max_projects === -1) return false // Unlimited
    return projects >= max_projects * 0.8
  }

  return {
    subscription,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Computed values
    trialDaysRemaining: getTrialDaysRemaining(),
    isOnTrial: isOnTrial(),
    isTrialEndingSoon: isTrialEndingSoon(),
    isTrialExpired: isTrialExpired(),
    hasActiveSubscription: hasActiveSubscription(),
    urgencyLevel: getUrgencyLevel(),
    trialProgress: getTrialProgress(),
    
    // Feature checks
    hasFeature,
    isNearUserLimit: isNearUserLimit(),
    isNearProjectLimit: isNearProjectLimit(),
  }
}
