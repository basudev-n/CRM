import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, X, ArrowRight, Sparkles, RefreshCw, UserPlus, Users, Building, Calendar, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link, useNavigate } from "react-router-dom"
import { dashboardApi, usersApi } from "@/services/api"
import { useState } from "react"

interface OnboardingItem {
  id: string
  title: string
  description: string
  icon: string
  href: string
  completed: boolean
  count?: number
}

const iconMap: Record<string, React.ReactNode> = {
  "user-plus": <UserPlus className="h-5 w-5" />,
  "users": <Users className="h-5 w-5" />,
  "user-group": <Users className="h-5 w-5" />,
  "building": <Building className="h-5 w-5" />,
  "calendar": <Calendar className="h-5 w-5" />,
  "file-text": <FileText className="h-5 w-5" />,
}

export default function OnboardingChecklist() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isMinimized, setIsMinimized] = useState(
    () => localStorage.getItem("onboarding-checklist-minimized") === "true"
  )

  // Check if dismissed from backend
  const { data: onboardingStatus } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => usersApi.getOnboardingStatus().then((res) => res.data),
    staleTime: 60000,
  })

  // Fetch onboarding progress from backend
  const { data: progressData, isLoading, refetch } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () => dashboardApi.getOnboardingProgress().then((res) => res.data),
    staleTime: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  })

  // Mutation to dismiss onboarding
  const dismissMutation = useMutation({
    mutationFn: () => usersApi.updateOnboardingStatus({ onboarding_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] })
    },
  })

  const items: OnboardingItem[] = progressData?.progress || []
  const completedCount = progressData?.completed_count || 0
  const totalCount = progressData?.total_count || 6
  const progress = progressData?.percentage || 0

  const toggleMinimize = () => {
    const newState = !isMinimized
    setIsMinimized(newState)
    localStorage.setItem("onboarding-checklist-minimized", newState.toString())
  }

  const handleDismiss = () => {
    dismissMutation.mutate()
  }

  const handleItemClick = (item: OnboardingItem) => {
    navigate(item.href)
  }

  // Hide if dismissed from backend
  if (onboardingStatus?.onboarding_dismissed) {
    return null
  }

  // Hide if all items are completed
  if (completedCount === totalCount && totalCount > 0) {
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-[#F7F5F2] rounded-3xl p-8 flex items-center gap-3">
        <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
        <span className="text-zinc-500 font-medium text-sm">Loading progress...</span>
      </div>
    )
  }

  return (
    <div className="bg-[#F7F5F2] rounded-3xl p-8 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-zinc-900" />
          </div>
          <div>
            <span className="text-lg font-semibold text-zinc-900">Get Started</span>
            <span className="ml-3 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              {completedCount}/{totalCount} done
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-white rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
            title="Refresh progress"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={toggleMinimize}
            className="p-2 hover:bg-white rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-zinc-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              progress === 100 ? "bg-emerald-500" : "bg-zinc-900"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {completedCount === totalCount
            ? "🎉 All tasks completed!"
            : `${completedCount} of ${totalCount} tasks completed`}
        </p>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="space-y-2 flex-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group ${
                item.completed
                  ? "bg-emerald-50 border border-emerald-100"
                  : "bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
              }`}
              onClick={() => !item.completed && handleItemClick(item)}
            >
              <div className="flex-shrink-0">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-zinc-300 group-hover:border-zinc-400 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${
                  item.completed ? "text-emerald-700" : "text-zinc-900"
                }`}>
                  {item.title}
                </p>
              </div>
              {!item.completed && (
                <Link to={item.href} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    className="flex-shrink-0 bg-zinc-900 hover:bg-zinc-800 text-white h-7 text-xs font-medium rounded-lg"
                  >
                    Start <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
              {item.completed && (
                <span className="text-xs font-medium text-emerald-600">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
