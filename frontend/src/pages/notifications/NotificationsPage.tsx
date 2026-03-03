import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react"

interface Notification {
  id: number
  notification_type: string
  title: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((res) => res.data),
  })

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api.get("/notifications/unread-count").then((res) => res.data),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] })
      toast({ title: "All notifications marked as read" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] })
    },
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "📋"
      case "lead_assigned":
        return "👤"
      case "site_visit_scheduled":
        return "📅"
      case "mention":
        return "💬"
      default:
        return "🔔"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadData?.count || 0} unread notifications
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-4 flex items-start gap-4 hover:bg-gray-50 ${
                    !notification.is_read ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="text-2xl">{getTypeIcon(notification.notification_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{notification.title}</p>
                      {!notification.is_read && (
                        <Badge variant="default">New</Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markReadMutation.mutate(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {data?.data?.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  No notifications
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
