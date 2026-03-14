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
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
            <span className="text-white font-semibold text-sm">Loading progress...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-white/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Get Started with PropFlow</h3>
            {isMinimized && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white/20 rounded-full h-1.5 max-w-xs">
                  <div
                    className="bg-white h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-white/80 min-w-fit">{completedCount}/{totalCount}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
            title="Refresh progress"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={toggleMinimize}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
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
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          {/* Progress Bar Section */}
          <div className="px-6 pt-4 pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Your Progress</span>
              <span className="text-sm font-bold text-zinc-900">{progress}%</span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  progress === 100 ? "bg-emerald-500" : progress >= 50 ? "bg-indigo-500" : "bg-zinc-900"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2.5">
              {completedCount === totalCount
                ? "🎉 All tasks completed! You're all set."
                : `${completedCount} of ${totalCount} tasks completed`}
            </p>
          </div>

          {/* Checklist Items */}
          <div className="px-6 py-4 space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl transition-all border cursor-pointer group ${
                  item.completed
                    ? "bg-emerald-50/50 border-emerald-100"
                    : "bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30"
                }`}
                onClick={() => !item.completed && handleItemClick(item)}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0 mt-0.5">
                  {item.completed ? (
                    <div className="relative">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-zinc-300 group-hover:border-indigo-400 transition-colors" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`${item.completed ? "text-emerald-600" : "text-zinc-600 group-hover:text-indigo-600"} transition-colors`}>
                      {iconMap[item.icon] || <Sparkles className="h-5 w-5" />}
                    </span>
                    <p
                      className={`font-semibold text-sm ${
                        item.completed ? "text-emerald-700" : "text-zinc-900 group-hover:text-indigo-900"
                      } transition-colors`}
                    >
                      {item.title}
                    </p>
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.completed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
                </div>

                {/* Action Button */}
                {!item.completed && (
                  <Link to={item.href} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      className="flex-shrink-0 bg-zinc-900 hover:bg-indigo-600 text-white h-8 text-xs font-medium rounded-lg transition-colors"
                    >
                      Start
                      <ArrowRight className="h-3 w-3 ml-1.5" />
                    </Button>
                  </Link>
                )}
                {item.completed && (
                  <span className="flex-shrink-0 text-xs font-medium text-emerald-600 px-2 py-1 bg-emerald-100 rounded-full">
                    ✓ Done
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer Tip */}
          <div className="px-6 py-3 border-t border-zinc-100 bg-gradient-to-r from-zinc-50 to-indigo-50/30">
            <p className="text-xs text-zinc-600">
              <span className="font-semibold">✨ Tip:</span> Complete all tasks to unlock your full CRM potential!{" "}
              {completedCount > 0 && completedCount < totalCount && (
                <span className="text-indigo-600 font-medium">You're making great progress!</span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
