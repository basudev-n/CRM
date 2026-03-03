import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/services/api"
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
    assignee_id: "",
    due_date: "",
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

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
        assignee_id: "",
        due_date: "",
      })
      toast({ title: "Task created successfully" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create task" })
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
    createMutation.mutate({
      ...formData,
      assignee_id: parseInt(formData.assignee_id),
    })
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
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Manage your tasks and follow-ups</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
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
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((task: Task) => {
                const isOverdue =
                  task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed"
                return (
                  <div key={task.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
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
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium ${
                            task.status === "completed" ? "line-through text-gray-400" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        <Badge variant="outline">{task.task_type}</Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {task.assignee && (
                          <span>
                            Assigned to: {task.assignee.first_name} {task.assignee.last_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                            <Calendar className="h-4 w-4" />
                            {new Date(task.due_date).toLocaleDateString()}
                            {isOverdue && <AlertCircle className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-gray-500">No tasks found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                  <Input
                    id="assignee"
                    type="number"
                    placeholder="User ID"
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
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
