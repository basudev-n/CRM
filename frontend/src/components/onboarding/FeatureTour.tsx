import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { X, ChevronRight, ChevronLeft, Sparkles, Rocket, LayoutDashboard, Users, Kanban, Building2, DollarSign, CheckSquare, BookUser, Bell, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usersApi } from "@/services/api"
import { useLocation } from "react-router-dom"

interface TourStep {
  id: string
  title: string
  description: string
  targetSelector: string
  position: "top" | "bottom" | "left" | "right" | "center"
  icon: React.ReactNode
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to PropFlow! 🎉",
    description: "Your all-in-one Real Estate CRM is ready. Let's take a quick tour to help you get started!",
    targetSelector: "body",
    position: "center",
    icon: <Rocket className="h-6 w-6" />
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "Get a complete overview of your leads, pipeline, revenue, and recent activities at a glance. This is your command center.",
    targetSelector: "[data-tour='dashboard']",
    position: "right",
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    id: "leads",
    title: "Manage Leads",
    description: "Track all your prospects here. Add new leads, segment them by source, and monitor conversion rates in real-time.",
    targetSelector: "[data-tour='leads']",
    position: "right",
    icon: <Users className="h-5 w-5" />
  },
  {
    id: "pipeline",
    title: "Sales Pipeline",
    description: "Visualize your sales process with a Kanban board. Drag and drop leads between stages to update their status instantly.",
    targetSelector: "[data-tour='pipeline']",
    position: "right",
    icon: <Kanban className="h-5 w-5" />
  },
  {
    id: "projects",
    title: "Projects & Inventory",
    description: "Manage your properties, towers, units, and project details. Track unit availability and pricing in one centralized place.",
    targetSelector: "[data-tour='projects']",
    position: "right",
    icon: <Building2 className="h-5 w-5" />
  },
  {
    id: "finance",
    title: "Finance & Billing",
    description: "Create quotations, invoices, payment schedules, and track all financial transactions. Generate cost sheets effortlessly.",
    targetSelector: "[data-tour='finance']",
    position: "right",
    icon: <DollarSign className="h-5 w-5" />
  },
  {
    id: "tasks",
    title: "Task Management",
    description: "Never miss a follow-up! Assign tasks to team members, set deadlines, and track progress across your team.",
    targetSelector: "[data-tour='tasks']",
    position: "right",
    icon: <CheckSquare className="h-5 w-5" />
  },
  {
    id: "contacts",
    title: "Contact Directory",
    description: "Maintain a comprehensive database of clients, vendors, and key contacts. Keep all relationships organized.",
    targetSelector: "[data-tour='contacts']",
    position: "right",
    icon: <BookUser className="h-5 w-5" />
  },
  {
    id: "notifications",
    title: "Stay Updated",
    description: "Receive instant notifications for important activities, task assignments, and lead updates.",
    targetSelector: "[data-tour='notifications']",
    position: "right",
    icon: <Bell className="h-5 w-5" />
  },
  {
    id: "settings",
    title: "Settings & Team",
    description: "Configure your workspace, invite team members, manage roles, and customize your preferences. You're all set!",
    targetSelector: "[data-tour='settings']",
    position: "right",
    icon: <Settings className="h-5 w-5" />
  }
]

interface FeatureTourProps {
  forceShow?: boolean
}

export default function FeatureTour({ forceShow = false }: FeatureTourProps) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  // Check onboarding status from backend
  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => usersApi.getOnboardingStatus().then((res) => res.data),
    staleTime: 60000,
  })

  // Record first login
  const firstLoginMutation = useMutation({
    mutationFn: () => usersApi.recordFirstLogin(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] })
    },
  })

  // Update tour seen status
  const updateTourMutation = useMutation({
    mutationFn: () => usersApi.updateOnboardingStatus({ has_seen_tour: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] })
    },
  })

  // Determine if tour should show
  useEffect(() => {
    if (isLoading) return
    
    // Force show if prop is set
    if (forceShow) {
      setIsVisible(true)
      return
    }

    // Show tour if user hasn't seen it and is on dashboard
    const shouldShow = onboardingStatus?.is_new_user || (!onboardingStatus?.has_seen_tour && location.pathname === "/")
    
    if (shouldShow) {
      // Record first login if new user
      if (onboardingStatus?.is_new_user) {
        firstLoginMutation.mutate()
      }
      // Small delay to let the page render
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [onboardingStatus, isLoading, forceShow, location.pathname])

  const step = tourSteps[currentStep]

  // Update target rect when step changes
  useEffect(() => {
    if (!isVisible || !step) return

    if (step.position === "center") {
      setTargetRect(null)
      return
    }

    const target = document.querySelector(step.targetSelector)
    if (target) {
      const rect = target.getBoundingClientRect()
      setTargetRect(rect)
    } else {
      setTargetRect(null)
    }
  }, [currentStep, step, isVisible])

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }, [currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const completeTour = useCallback(() => {
    setIsVisible(false)
    updateTourMutation.mutate()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      } else if (e.key === "Escape") {
        completeTour()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, handleNext, handlePrev, completeTour])

  if (!isVisible || !step) return null

  const getTooltipPosition = () => {
    if (step.position === "center" || !targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      }
    }

    const gap = 20
    switch (step.position) {
      case "top":
        return {
          top: `${targetRect.top - gap}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%) translateY(-100%)"
        }
      case "bottom":
        return {
          top: `${targetRect.top + targetRect.height + gap}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)"
        }
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - gap}px`,
          transform: "translate(-100%, -50%)"
        }
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left + targetRect.width + gap}px`,
          transform: "translateY(-50%)"
        }
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    }
  }

  const tooltipPos = getTooltipPosition()

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300"
        onClick={completeTour}
      />

      {/* Highlight spotlight for non-center steps */}
      {targetRect && step.position !== "center" && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg transition-all duration-300"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 3px rgba(99, 102, 241, 0.8), 0 0 20px rgba(99, 102, 241, 0.5)`,
            background: "transparent"
          }}
        />
      )}

      {/* Tour Tooltip */}
      <div
        className="fixed z-[10000] bg-white rounded-2xl shadow-2xl p-6 w-[380px] max-w-[90vw] border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-200"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: tooltipPos.transform as string,
        }}
      >
        {/* Close button */}
        <button
          onClick={completeTour}
          className="absolute top-4 right-4 p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <X className="h-4 w-4 text-zinc-400" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            {step.icon}
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-zinc-900 mb-2">{step.title}</h3>

        {/* Description */}
        <p className="text-sm text-zinc-600 mb-5 leading-relaxed">{step.description}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {tourSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-6 bg-indigo-500"
                  : index < currentStep
                  ? "w-2 bg-indigo-300"
                  : "w-2 bg-zinc-200 hover:bg-zinc-300"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex-1 border-zinc-300 text-zinc-700 hover:bg-zinc-50 h-10 font-medium"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-10 font-medium rounded-lg"
          >
            {currentStep === tourSteps.length - 1 ? (
              <>
                Get Started
                <Rocket className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Skip link */}
        <button
          onClick={completeTour}
          className="w-full mt-3 text-xs text-zinc-500 hover:text-zinc-700 transition-colors font-medium"
        >
          Skip tour (press Esc)
        </button>
      </div>
    </>
  )
}
