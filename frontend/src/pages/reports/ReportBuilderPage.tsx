import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { reportsApi } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { Wand2, Download, Save, FileText, Trash2, Play, BarChart3, Table, ChevronDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface ReportFilter {
  field: string
  operator: string
  value: string
}

interface ReportConfig {
  entity: string
  fields: string[]
  filters: ReportFilter[]
  group_by: string | null
  aggregations: string[]
  aggregate_field: string | null
  sort_by: string | null
  sort_order: string
  date_from: string | null
  date_to: string | null
  limit: number
}

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "contains", label: "contains" },
]

const AGGREGATIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
]

const CHART_COLORS = ["#18181b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"]

export default function ReportBuilderPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [config, setConfig] = useState<ReportConfig>({
    entity: "",
    fields: [],
    filters: [],
    group_by: null,
    aggregations: [],
    aggregate_field: null,
    sort_by: null,
    sort_order: "desc",
    date_from: null,
    date_to: null,
    limit: 1000,
  })

  const [results, setResults] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"table" | "chart">("table")
  const [templateName, setTemplateName] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Fetch available entities
  const { data: entitiesData } = useQuery({
    queryKey: ["report-entities"],
    queryFn: () => reportsApi.getEntities().then((r) => r.data),
  })

  // Fetch saved templates
  const { data: templatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => reportsApi.getTemplates().then((r) => r.data),
  })

  // Run report mutation
  const runReportMutation = useMutation({
    mutationFn: (reportConfig: ReportConfig) => reportsApi.runReport(reportConfig).then((r) => r.data),
    onSuccess: (data) => {
      setResults(data)
      toast({ title: "Report generated", description: `Found ${data.total || data.total_groups || 0} results` })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to generate report" })
    },
  })

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (reportConfig: ReportConfig) => reportsApi.exportReport(reportConfig).then((r) => r.data),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(new Blob([blob]))
      const a = document.createElement("a")
      a.href = url
      a.download = `report_${config.entity}_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({ title: "Report exported" })
    },
    onError: () => {
      toast({ variant: "destructive", title: "Export failed" })
    },
  })

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: ({ name, cfg }: { name: string; cfg: ReportConfig }) => reportsApi.saveTemplate(name, cfg),
    onSuccess: () => {
      toast({ title: "Template saved" })
      setShowSaveDialog(false)
      setTemplateName("")
      refetchTemplates()
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to save template" })
    },
  })

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => reportsApi.deleteTemplate(id),
    onSuccess: () => {
      toast({ title: "Template deleted" })
      refetchTemplates()
    },
  })

  // Get current entity configuration
  const currentEntity = useMemo(() => {
    return entitiesData?.entities?.find((e: any) => e.name === config.entity)
  }, [entitiesData, config.entity])

  const handleEntityChange = (entity: string) => {
    setConfig({
      ...config,
      entity,
      fields: [],
      filters: [],
      group_by: null,
      aggregations: [],
      aggregate_field: null,
    })
    setResults(null)
  }

  const handleFieldToggle = (field: string, checked: boolean) => {
    setConfig((prev) => ({
      ...prev,
      fields: checked ? [...prev.fields, field] : prev.fields.filter((f) => f !== field),
    }))
  }

  const addFilter = () => {
    setConfig((prev) => ({
      ...prev,
      filters: [...prev.filters, { field: "", operator: "eq", value: "" }],
    }))
  }

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    }))
  }

  const removeFilter = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }))
  }

  const loadTemplate = (template: any) => {
    if (template.config) {
      setConfig(template.config)
      setResults(null)
    }
  }

  const runReport = () => {
    if (!config.entity) {
      toast({ variant: "destructive", title: "Please select an entity" })
      return
    }
    runReportMutation.mutate(config)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-zinc-900 leading-tight">
            Report <span className="font-semibold">Builder</span>
          </h1>
          <p className="text-zinc-500 mt-2">Create custom reports with drag-and-drop fields, filters, and groupings.</p>
        </div>
        <div className="flex gap-2">
          {results && (
            <>
              <Button
                variant="outline"
                className="rounded-full border-zinc-300 hover:bg-zinc-100"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
              <Button
                className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
                onClick={() => exportMutation.mutate(config)}
                disabled={exportMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Saved Templates */}
          {templatesData?.templates?.length > 0 && (
            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h4 className="text-sm font-semibold text-zinc-900">Saved Templates</h4>
              </div>
              <div className="p-4 space-y-2">
                {templatesData.templates.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded-2xl">
                    <button onClick={() => loadTemplate(t)} className="text-sm font-medium hover:underline text-left flex-1">
                      {t.name}
                    </button>
                    <button
                      onClick={() => deleteTemplateMutation.mutate(t.id)}
                      className="text-zinc-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entity Selection */}
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100">
              <h4 className="text-sm font-semibold text-zinc-900">Data Source</h4>
            </div>
            <div className="p-4">
              <Select value={config.entity} onValueChange={handleEntityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {entitiesData?.entities?.map((entity: any) => (
                    <SelectItem key={entity.name} value={entity.name}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Field Selection */}
          {currentEntity && (
            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h4 className="text-sm font-semibold text-zinc-900">Fields</h4>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {currentEntity.fields.map((field: any) => (
                  <div key={field.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={config.fields.includes(field.name)}
                      onCheckedChange={(checked) => handleFieldToggle(field.name, !!checked)}
                    />
                    <label htmlFor={field.name} className="text-sm cursor-pointer">
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          {currentEntity && (
            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h4 className="text-sm font-semibold text-zinc-900">Date Range</h4>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-xs">From</Label>
                  <DatePicker value={config.date_from || ""} onChange={(v) => setConfig((p) => ({ ...p, date_from: v || null }))} />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <DatePicker value={config.date_to || ""} onChange={(v) => setConfig((p) => ({ ...p, date_to: v || null }))} />
                </div>
              </div>
            </div>
          )}

          {/* Group By & Aggregations */}
          {currentEntity && currentEntity.groupable?.length > 0 && (
            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h4 className="text-sm font-semibold text-zinc-900">Group & Aggregate</h4>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-xs">Group By</Label>
                  <Select value={config.group_by || ""} onValueChange={(v) => setConfig((p) => ({ ...p, group_by: v || null }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="No grouping" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No grouping</SelectItem>
                      {currentEntity.groupable.map((g: string) => (
                        <SelectItem key={g} value={g}>
                          {g.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.group_by && currentEntity.aggregatable?.length > 0 && (
                  <>
                    <div>
                      <Label className="text-xs">Aggregate Field</Label>
                      <Select value={config.aggregate_field || ""} onValueChange={(v) => setConfig((p) => ({ ...p, aggregate_field: v || null }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {currentEntity.aggregatable.map((f: string) => (
                            <SelectItem key={f} value={f}>
                              {f.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Aggregations</Label>
                      {AGGREGATIONS.filter((a) => a.value !== "count").map((agg) => (
                        <div key={agg.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`agg-${agg.value}`}
                            checked={config.aggregations.includes(agg.value)}
                            onCheckedChange={(checked) =>
                              setConfig((p) => ({
                                ...p,
                                aggregations: checked
                                  ? [...p.aggregations, agg.value]
                                  : p.aggregations.filter((a) => a !== agg.value),
                              }))
                            }
                          />
                          <label htmlFor={`agg-${agg.value}`} className="text-sm cursor-pointer">
                            {agg.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          {currentEntity && (
            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900">Filters</h4>
                <Button variant="outline" size="sm" onClick={addFilter}>
                  Add Filter
                </Button>
              </div>
              {config.filters.length > 0 && (
                <div className="p-4 space-y-2">
                  {config.filters.map((filter, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select value={filter.field} onValueChange={(v) => updateFilter(idx, { field: v })}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentEntity.fields.map((f: any) => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filter.operator} onValueChange={(v) => updateFilter(idx, { operator: v })}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) => updateFilter(idx, { value: e.target.value })}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeFilter(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Run Button */}
          <div className="flex justify-end gap-2">
            {results && (
              <div className="flex border rounded-lg overflow-hidden mr-auto">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-2 text-sm ${viewMode === "table" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600"}`}
                >
                  <Table className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("chart")}
                  className={`px-3 py-2 text-sm ${viewMode === "chart" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600"}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              </div>
            )}
            <Button onClick={runReport} disabled={!config.entity || runReportMutation.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {runReportMutation.isPending ? "Running..." : "Run Report"}
            </Button>
          </div>

          {/* Results */}
          {results && (
            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Results ({results.type === "aggregated" ? `${results.total_groups} groups` : `${results.total} records`})
                </h4>
              </div>
              <div className="p-0">
                {viewMode === "table" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="border-b bg-zinc-50">
                        <tr>
                          {results.type === "aggregated" ? (
                            <>
                              <th className="text-left p-3 text-sm font-medium text-zinc-600">{results.group_by}</th>
                              <th className="text-left p-3 text-sm font-medium text-zinc-600">Count</th>
                              {results.aggregations?.includes("sum") && (
                                <th className="text-left p-3 text-sm font-medium text-zinc-600">Sum</th>
                              )}
                              {results.aggregations?.includes("avg") && (
                                <th className="text-left p-3 text-sm font-medium text-zinc-600">Avg</th>
                              )}
                              {results.aggregations?.includes("min") && (
                                <th className="text-left p-3 text-sm font-medium text-zinc-600">Min</th>
                              )}
                              {results.aggregations?.includes("max") && (
                                <th className="text-left p-3 text-sm font-medium text-zinc-600">Max</th>
                              )}
                            </>
                          ) : (
                            results.fields?.map((field: string) => (
                              <th key={field} className="text-left p-3 text-sm font-medium text-zinc-600">
                                {field.replace("_", " ")}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {results.data?.map((row: any, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-zinc-50">
                            {results.type === "aggregated" ? (
                              <>
                                <td className="p-3 text-sm font-medium">{row.group_key || "(empty)"}</td>
                                <td className="p-3 text-sm">{row.count}</td>
                                {results.aggregations?.includes("sum") && (
                                  <td className="p-3 text-sm">{typeof row.sum === "number" ? row.sum.toLocaleString() : "-"}</td>
                                )}
                                {results.aggregations?.includes("avg") && (
                                  <td className="p-3 text-sm">{typeof row.avg === "number" ? row.avg.toFixed(2) : "-"}</td>
                                )}
                                {results.aggregations?.includes("min") && (
                                  <td className="p-3 text-sm">{typeof row.min === "number" ? row.min.toLocaleString() : "-"}</td>
                                )}
                                {results.aggregations?.includes("max") && (
                                  <td className="p-3 text-sm">{typeof row.max === "number" ? row.max.toLocaleString() : "-"}</td>
                                )}
                              </>
                            ) : (
                              results.fields?.map((field: string) => (
                                <td key={field} className="p-3 text-sm">
                                  {row[field]?.toString() || "-"}
                                </td>
                              ))
                            )}
                          </tr>
                        ))}
                        {results.data?.length === 0 && (
                          <tr>
                            <td colSpan={10} className="text-center py-8 text-zinc-500">
                              No results found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 h-80">
                    {results.type === "aggregated" ? (
                      <div className="grid md:grid-cols-2 gap-4 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={results.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                            <XAxis dataKey="group_key" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={results.data}
                              dataKey="count"
                              nameKey="group_key"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ group_key, percent }) => `${group_key}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {results.data?.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500">
                        Chart view is only available for grouped reports
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!results && config.entity && (
            <div className="text-center py-16 text-zinc-500">
              <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Configure your report and click "Run Report" to see results</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl border border-zinc-200 w-96 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="text-lg font-semibold text-zinc-900">Save Report Template</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Lead Summary"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => saveTemplateMutation.mutate({ name: templateName, cfg: config })}
                  disabled={!templateName || saveTemplateMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
