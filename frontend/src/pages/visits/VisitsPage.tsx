import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DatePicker, TimePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, MapPin, User, Plus, Clock, X, ChevronLeft, ChevronRight, List } from "lucide-react"

interface Visit {
  id: number
  lead_id: number
  scheduled_date: string
  project_name: string
  location: string
  remarks: string
  outcome: string
  feedback: string
  completed_at: string
  lead: { id: number; name: string; phone: string }
  agent: { id: number; first_name: string; last_name: string }
}

const outcomeOptions = [
  { value: "interested", label: "Interested", color: "bg-green-100 text-green-700" },
  { value: "not_interested", label: "Not Interested", color: "bg-red-100 text-red-700" },
  { value: "follow_up", label: "Need Follow-up", color: "bg-yellow-100 text-yellow-700" },
  { value: "booked", label: "Booked", color: "bg-blue-100 text-blue-700" },
]

const emptyVisitForm = () => ({
  lead_id: "",
  project_id: "",
  project_name: "",
  location: "",
  remarks: "",
  assigned_agent_id: "",
})

export default function VisitsPage() {
  const [view, setView] = useState<"list" | "calendar">("list")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOutcomeModal, setShowOutcomeModal] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [outcome, setOutcome] = useState("")
  const [feedback, setFeedback] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [formData, setFormData] = useState(emptyVisitForm())
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [slotLoading, setSlotLoading] = useState(false)
  const [conflict, setConflict] = useState<{ has_conflicts: boolean; conflicts: any[] } | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["visits", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.append("page", "1")
      params.append("per_page", "100")
      if (statusFilter !== "all") params.append("status_filter", statusFilter)
      return api.get(`/visits?${params}`).then((res) => res.data)
    },
  })

  const { data: leadsData } = useQuery({
    queryKey: ["leads-for-visit"],
    queryFn: () => api.get("/leads/").then((res) => res.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ["org-users"],
    queryFn: () => api.get("/users/").then((res) => res.data),
  })

  const { data: projectsData } = useQuery({
    queryKey: ["projects-for-visit"],
    queryFn: () => api.get("/projects/").then((res) => res.data),
  })

  // Group visits by date for calendar view
  const visitsByDate = useMemo(() => {
    const grouped: Record<string, Visit[]> = {}
    if (data?.data) {
      data.data.forEach((visit: Visit) => {
        const date = new Date(visit.scheduled_date).toDateString()
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(visit)
      })
    }
    return grouped
  }, [data])

  // Calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month days
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -firstDay.getDay() + i + 1)
      days.push({ date: d, isCurrentMonth: false })
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Next month days
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }, [currentDate])

  const resetVisitForm = () => {
    setFormData(emptyVisitForm())
    setSelectedDate("")
    setSelectedTime("")
    setAvailableSlots([])
    setBookedSlots([])
    setConflict(null)
  }

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([])
      setBookedSlots([])
      return
    }
    let isMounted = true
    setSlotLoading(true)
    const params: Record<string, number | string> = { date: selectedDate }
    if (formData.project_id) {
      params.project_id = Number(formData.project_id)
    }
    api.get("/visits/available-slots", { params })
      .then((res) => {
        if (!isMounted) return
        setAvailableSlots(res.data.available_slots || [])
        setBookedSlots(res.data.booked_slots || [])
      })
      .catch(() => {
        if (!isMounted) return
        setAvailableSlots([])
        setBookedSlots([])
      })
      .finally(() => {
        if (isMounted) setSlotLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [selectedDate, formData.project_id])

  useEffect(() => {
    if (!selectedDate || !selectedTime || !formData.assigned_agent_id) {
      setConflict(null)
      return
    }
    let isMounted = true
    const payloadDate = `${selectedDate} ${selectedTime}`
    api
      .get("/visits/check-conflicts", {
        params: {
          agent_id: Number(formData.assigned_agent_id),
          scheduled_date: payloadDate,
        },
      })
      .then((res) => {
        if (!isMounted) return
        setConflict(res.data)
      })
      .catch(() => {
        if (!isMounted) return
        setConflict(null)
      })
    return () => {
      isMounted = false
    }
  }, [selectedDate, selectedTime, formData.assigned_agent_id])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/visits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] })
      setShowCreateModal(false)
      resetVisitForm()
      toast({ title: "Site visit scheduled" })
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || "Failed to schedule visit"
      toast({ variant: "destructive", title: message })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.patch(`/visits/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] })
      setShowOutcomeModal(false)
      toast({ title: "Visit updated" })
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || "Failed to update visit"
      toast({ variant: "destructive", title: message })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.lead_id) {
      toast({ variant: "destructive", title: "Please select a lead" })
      return
    }
    if (!formData.project_id) {
      toast({ variant: "destructive", title: "Please select a project" })
      return
    }
    if (!formData.assigned_agent_id) {
      toast({ variant: "destructive", title: "Please assign an agent" })
      return
    }
    if (!selectedDate) {
      toast({ variant: "destructive", title: "Pick a date" })
      return
    }

    let scheduled_date = ""
    if (selectedDate && selectedTime) {
      scheduled_date = `${selectedDate}T${selectedTime}:00`
    } else if (selectedDate) {
      scheduled_date = `${selectedDate}T10:00:00`
    }

    const leadId = parseInt(formData.lead_id)
    const agentId = parseInt(formData.assigned_agent_id)

    createMutation.mutate({
      lead_id: leadId,
      assigned_agent_id: agentId,
      scheduled_date,
      project_name: formData.project_name,
      location: formData.location,
      remarks: formData.remarks,
    })
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Site <span className="font-semibold">Visits</span>
          </h1>
          <p className="text-zinc-500 mt-2">Schedule and manage site visits</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-zinc-200 rounded-full overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${view === "list" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${view === "calendar" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
            >
              <Calendar className="h-4 w-4" /> Calendar
            </button>
          </div>
          <Button
            onClick={() => {
              resetVisitForm()
              setShowCreateModal(true)
            }}
            className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Schedule Visit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
          className={statusFilter === "all" ? "bg-black text-white" : ""}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "scheduled" ? "default" : "outline"}
          onClick={() => setStatusFilter("scheduled")}
          className={statusFilter === "scheduled" ? "bg-black text-white" : ""}
        >
          Scheduled
        </Button>
        <Button
          variant={statusFilter === "completed" ? "default" : "outline"}
          onClick={() => setStatusFilter("completed")}
          className={statusFilter === "completed" ? "bg-black text-white" : ""}
        >
          Completed
        </Button>
      </div>

      {/* List View */}
      {view === "list" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center py-10">Loading...</div>
          ) : data?.data?.length > 0 ? (
            data.data.map((visit: Visit) => (
              <div key={visit.id} className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">{visit.lead?.name || "Lead"}</h3>
                      <p className="text-sm text-zinc-500">{visit.project_name || "Site Visit"}</p>
                    </div>
                    {visit.outcome && (
                      <Badge className={outcomeOptions.find(o => o.value === visit.outcome)?.color}>
                        {outcomeOptions.find(o => o.value === visit.outcome)?.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Calendar className="h-4 w-4" />
                      {new Date(visit.scheduled_date).toLocaleDateString()} at {new Date(visit.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {visit.location && (
                      <div className="flex items-center gap-2 text-zinc-600">
                        <MapPin className="h-4 w-4" /> {visit.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-zinc-600">
                      <User className="h-4 w-4" />
                      {visit.agent?.first_name} {visit.agent?.last_name}
                    </div>
                    {visit.remarks && <p className="text-zinc-500 mt-2">{visit.remarks}</p>}
                  </div>
                  {!visit.completed_at && (
                    <Button
                      variant="outline"
                      className="w-full mt-4 border-black text-black hover:bg-black hover:text-white"
                      onClick={() => {
                        setSelectedVisit(visit)
                        setOutcome("")
                        setFeedback("")
                        setShowOutcomeModal(true)
                      }}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-zinc-500">
              No visits found
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold text-zinc-900">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-zinc-500 py-2">
                  {day}
                </div>
              ))}
              {calendarDays.map(({ date, isCurrentMonth }, i) => {
                const dateStr = date.toDateString()
                const visits = visitsByDate[dateStr] || []
                const isToday = dateStr === new Date().toDateString()

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border rounded p-2 ${!isCurrentMonth ? "bg-zinc-50" : ""}`}
                  >
                    <div className={`text-sm mb-1 ${isToday ? "bg-black text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                      {date.getDate()}
                    </div>
                    {visits.slice(0, 2).map((visit) => (
                      <div
                        key={visit.id}
                        className={`text-xs p-1 rounded mb-1 truncate cursor-pointer ${
                          visit.outcome
                            ? "bg-zinc-100 text-zinc-600"
                            : "bg-blue-100 text-blue-700"
                        }`}
                        onClick={() => {
                          setSelectedVisit(visit)
                          setOutcome(visit.outcome || "")
                          setFeedback(visit.feedback || "")
                          setShowOutcomeModal(true)
                        }}
                      >
                        {visit.lead?.name || "Lead"}
                      </div>
                    ))}
                    {visits.length > 2 && (
                      <div className="text-xs text-zinc-500">+{visits.length - 2} more</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Schedule Site Visit</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    resetVisitForm()
                    setShowCreateModal(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Lead *</Label>
                  <Select value={formData.lead_id} onValueChange={(v) => setFormData({ ...formData, lead_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose a lead" /></SelectTrigger>
                    <SelectContent>
                      {leadsData?.data?.map((lead: any) => (
                        <SelectItem key={lead.id} value={String(lead.id)}>
                          {lead.name} {lead.phone && `(${lead.phone})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <DatePicker value={selectedDate} onChange={setSelectedDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <TimePicker value={selectedTime} onChange={setSelectedTime} />
                  </div>
                </div>

                {selectedDate && (
                  <div className="space-y-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Available time slots</p>
                    {slotLoading ? (
                      <p className="text-sm text-zinc-500">Checking availability...</p>
                    ) : availableSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            className={`px-3 py-1 rounded-full border text-sm transition ${
                              selectedTime === slot
                                ? "bg-black text-white border-black"
                                : "border-zinc-300 text-zinc-700 hover:border-zinc-500"
                            }`}
                            onClick={() => setSelectedTime(slot)}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-rose-500">No slots available for the selected date.</p>
                    )}
                    {bookedSlots.length > 0 && (
                      <p className="text-[11px] text-zinc-500">Booked: {bookedSlots.join(", ")}</p>
                    )}
                    {conflict?.has_conflicts && (
                      <p className="text-[11px] text-rose-500">
                        This agent has another visit nearby; please choose a different time.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Project *</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => {
                      const project = projectsData?.data?.find((p: any) => String(p.id) === value)
                      setFormData({
                        ...formData,
                        project_id: value,
                        project_name: project?.name || "",
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsData?.data?.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Enter location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assign Agent *</Label>
                  <Select value={formData.assigned_agent_id} onValueChange={(v) => setFormData({ ...formData, assigned_agent_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                    <SelectContent>
                      {usersData?.map((user: any) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Add any notes..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetVisitForm()
                      setShowCreateModal(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} className="bg-black text-white hover:bg-zinc-800">
                    {createMutation.isPending ? "Scheduling..." : "Schedule Visit"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outcome Modal */}
      {showOutcomeModal && selectedVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mark Visit Complete</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowOutcomeModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-zinc-50 p-3 rounded-lg">
                <p className="text-sm text-zinc-500">Lead</p>
                <p className="font-medium">{selectedVisit.lead?.name || "Lead"}</p>
                <p className="text-sm text-zinc-500 mt-1">Project</p>
                <p className="font-medium">{selectedVisit.project_name}</p>
              </div>

              <div className="space-y-2">
                <Label>Outcome *</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                  <SelectContent>
                    {outcomeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Feedback</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowOutcomeModal(false)}>Cancel</Button>
                <Button
                  disabled={!outcome || updateMutation.isPending}
                  onClick={() => {
                    updateMutation.mutate({ id: selectedVisit.id, data: { outcome, feedback } })
                    setShowOutcomeModal(false)
                  }}
                  className="bg-black text-white hover:bg-zinc-800"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
