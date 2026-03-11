import { useMemo, useState } from "react"
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
import { api, leadsApi, usersApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, Circle, Clock, AlertCircle, Plus, Calendar } from "lucide-react"

interface Task {
  id: number
  title: string
  description: string
  task_type: string
  priority: string
  status: string
  due_date: string
  completed_at: string
  assignee: {
    id: number
    first_name: string
    last_name: string
  }
  lead_id: number
}

export default function TasksPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<"all" | "my" | "today" | "overdue">("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "follow_up",
    priority: "medium",
    lead_id: "",
    assignee_id: "",
    due_date: "",
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: leadsData } = useQuery({
    queryKey: ["leads-for-tasks"],
    queryFn: () => leadsApi.list({ per_page: 200 }).then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  })

  const { data: assigneesData } = useQuery({
    queryKey: ["org-users-for-tasks"],
    queryFn: () => usersApi.getOrgUsers().then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  })

  const { data: overview } = useQuery({
    queryKey: ["tasks-overview"],
    queryFn: () => api.get("/tasks/overview").then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", "20")
      if (filter === "my") params.append("my_tasks", "true")
      if (filter === "today") params.append("today", "true")
      if (filter === "overdue") params.append("overdue", "true")
      return api.get(`/tasks?${params}`).then((res) => res.data)
    },
  })

  const leadLookup = useMemo(() => {
    const map = new Map<number, any>()
    leadsData?.data?.forEach((lead: any) => {
      if (lead.id) map.set(lead.id, lead)
    })
    return map
  }, [leadsData])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setShowCreateModal(false)
      setFormData({
        title: "",
        description: "",
        task_type: "follow_up",
        priority: "medium",
        lead_id: "",
        assignee_id: "",
        due_date: "",
      })
      toast({ title: "Task created successfully" })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to create task"
      toast({ variant: "destructive", title: message })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.patch(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast({ title: "Task updated" })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = {
      ...formData,
      assignee_id: parseInt(formData.assignee_id),
      lead_id: formData.lead_id ? parseInt(formData.lead_id) : undefined,
    }
    if (!formData.due_date) {
      delete data.due_date
    }
    createMutation.mutate(data)
  }

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateMutation.mutate({
      id: taskId,
      data: { status: newStatus, completion_notes: "Completed" },
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "warning"
      default:
        return "secondary"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <Circle className="h-5 w-5 text-zinc-400" />
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Your <span className="font-semibold">Tasks</span>
          </h1>
          <p className="text-zinc-500 mt-2">Manage your tasks and follow-ups</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            title: "Total Tasks",
            value: overview?.total ?? 0,
            helper: "All assigned tasks",
          },
          {
            title: "Completed",
            value: overview?.completed ?? 0,
            helper: "Finished this org",
          },
          {
            title: "Pending",
            value: overview?.pending ?? 0,
            helper: "Awaiting action",
          },
          {
            title: "Today",
            value: overview?.today ?? 0,
            helper: "Due today",
          },
        ].map((stat) => (
          <div key={stat.title} className="bg-white rounded-3xl p-5 border border-zinc-200">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-1">{stat.title}</p>
            <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{stat.helper}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All Tasks
        </Button>
        <Button
          variant={filter === "my" ? "default" : "outline"}
          onClick={() => setFilter("my")}
        >
          My Tasks
        </Button>
        <Button
          variant={filter === "today" ? "default" : "outline"}
          onClick={() => setFilter("today")}
        >
          Today
        </Button>
        <Button
          variant={filter === "overdue" ? "default" : "outline"}
          onClick={() => setFilter("overdue")}
        >
          Overdue
        </Button>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((task: Task) => {
                const isOverdue =
                  task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed"
                const lead = leadLookup.get(task.lead_id)
                return (
                  <div key={task.id} className="p-4 flex items-start gap-4 hover:bg-zinc-50">
                    <button
                      onClick={() =>
                        handleStatusChange(
                          task.id,
                          task.status === "completed" ? "pending" : "completed"
                        )
                      }
                      className="mt-1"
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-medium ${
                            task.status === "completed" ? "line-through text-zinc-400" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        <Badge variant="outline">{task.task_type}</Badge>
                        <Badge variant="outline" className="capitalize tracking-[0.2em]">
                          {task.status}
                        </Badge>
                      </div>
                      {lead && (
                        <p className="text-sm text-zinc-500">
                          Lead: {lead.name} {lead.phone ? `(${lead.phone})` : ""}
                        </p>
                      )}
                      {task.description && (
                        <p className="text-sm text-zinc-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                        {task.assignee && (
                          <span>
                            Assigned to: {task.assignee.first_name} {task.assignee.last_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                            <Calendar className="h-4 w-4" />
                            {new Date(task.due_date).toLocaleDateString()}{" "}
                            {new Date(task.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isOverdue && <AlertCircle className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-zinc-500">No tasks found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead">Link Lead</Label>
                  <Select value={formData.lead_id} onValueChange={(value) => setFormData({ ...formData, lead_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadsData?.data?.map((lead: any) => (
                        <SelectItem key={lead.id} value={String(lead.id)}>
                          {lead.name} {lead.phone ? `(${lead.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="task_type">Type</Label>
                    <Select
                      value={formData.task_type}
                      onValueChange={(value) => setFormData({ ...formData, task_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="send_document">Send Document</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="approval">Approval</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign To *</Label>
                  <Select
                    value={formData.assignee_id}
                    onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneesData?.map((user: any) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker
                      value={formData.due_date ? formData.due_date.split("T")[0] : ""}
                      onChange={(date) => {
                        const currentTime = formData.due_date?.split("T")[1]?.slice(0, 5) || "10:00"
                        setFormData({ ...formData, due_date: `${date}T${currentTime}` })
                      }}
                    />
                    <TimePicker
                      value={formData.due_date?.split("T")[1]?.slice(0, 5) || ""}
                      onChange={(time) => {
                        const currentDate = formData.due_date?.split("T")[0] || new Date().toISOString().split("T")[0]
                        setFormData({ ...formData, due_date: `${currentDate}T${time}:00` })
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
