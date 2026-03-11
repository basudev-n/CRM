import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { auditLogsApi } from "@/services/api"

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState("")
  const [entityType, setEntityType] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, action, entityType],
    queryFn: () =>
      auditLogsApi
        .list({
          page,
          per_page: 20,
          action: action || undefined,
          entity_type: entityType || undefined,
        })
        .then((res) => res.data),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
          Audit <span className="font-semibold">Logs</span>
        </h1>
        <p className="text-zinc-500 mt-2">Track who changed what and when across your CRM.</p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Filters</h3>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="POST leads, PATCH tasks..." />
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="leads, tasks, finance..." />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Recent Activity</h3>
        </div>
        <div className="p-0">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b bg-zinc-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-zinc-600">Time</th>
                  <th className="text-left p-3 text-sm font-medium text-zinc-600">User</th>
                  <th className="text-left p-3 text-sm font-medium text-zinc-600">Action</th>
                  <th className="text-left p-3 text-sm font-medium text-zinc-600">Entity</th>
                  <th className="text-left p-3 text-sm font-medium text-zinc-600">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-zinc-600">Endpoint</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((log: any) => (
                  <tr key={log.id} className="border-b hover:bg-zinc-50">
                    <td className="p-3 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-3 text-sm">{log.user_name}</td>
                    <td className="p-3 text-sm font-medium">{log.action}</td>
                    <td className="p-3 text-sm">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</td>
                    <td className="p-3 text-sm">{log.status_code}</td>
                    <td className="p-3 text-xs text-zinc-500 max-w-[320px] truncate">{log.endpoint}</td>
                  </tr>
                ))}
                {(data?.data?.length || 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-500">No logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {data?.meta?.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {data.meta.pages}</span>
          <Button variant="outline" disabled={page >= data.meta.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
