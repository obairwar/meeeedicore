"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useSocket } from "@/components/shared/SocketProvider"
import { PdfEmbedViewerDynamic } from "@/components/shared/PdfEmbedViewerDynamic"
import { toastError, toastSuccess } from "@/lib/toast-api"
import { DndContext, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type LabStatus = "ORDERED" | "SAMPLE_COLLECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED"

export type LabOrderListItem = {
  id: string
  testName: string
  status: LabStatus
  orderedAt: string
  completedAt: string | null
  resultUrl: string | null
  notes: string | null
  patient: { id: string; name: string } | null
  doctor: { id: string; name: string } | null
  appointmentId: string | null
}

const STATUSES: LabStatus[] = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED"]

function labResultLooksPdf(url: string) {
  return /\.pdf($|\?)/i.test(url)
}

export function LabOrderStatusBadge({ status }: { status: LabStatus }) {
  const variant =
    status === "COMPLETED"
      ? "default"
      : status === "PROCESSING"
        ? "secondary"
        : status === "SAMPLE_COLLECTED"
          ? "outline"
          : status === "ORDERED"
            ? "outline"
            : "destructive"
  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>
}

export function LabStatsCards({ orders }: { orders: LabOrderListItem[] }) {
  const pending = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED").length
  const inProgress = orders.filter((o) => o.status === "SAMPLE_COLLECTED" || o.status === "PROCESSING").length
  const completedToday = orders.filter((o) => {
    if (o.status !== "COMPLETED" || !o.completedAt) return false
    const d = new Date(o.completedAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Pending orders</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{pending}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">In progress</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{inProgress}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Completed today</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{completedToday}</CardContent>
      </Card>
    </div>
  )
}

export function LabOrdersTable({
  orders,
  onChangeStatus,
  onUploadResult,
}: {
  orders: LabOrderListItem[]
  onChangeStatus: (id: string, status: LabStatus) => Promise<void>
  onUploadResult: (order: LabOrderListItem) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-3 py-2">Order ID</th>
            <th className="px-3 py-2">Patient</th>
            <th className="px-3 py-2">Test Name</th>
            <th className="px-3 py-2">Doctor</th>
            <th className="px-3 py-2">Ordered At</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{o.id.slice(0, 8)}</td>
              <td className="px-3 py-2">{o.patient?.name ?? "—"}</td>
              <td className="px-3 py-2">{o.testName}</td>
              <td className="px-3 py-2">{o.doctor?.name ?? "—"}</td>
              <td className="px-3 py-2">{new Date(o.orderedAt).toLocaleString()}</td>
              <td className="px-3 py-2">
                <LabOrderStatusBadge status={o.status} />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  {o.status !== "COMPLETED" && (
                    <Button size="sm" variant="outline" onClick={() => onChangeStatus(o.id, nextStatus(o.status))}>
                      Move next
                    </Button>
                  )}
                  {o.status === "COMPLETED" && (
                    <Button size="sm" variant="outline" onClick={() => onUploadResult(o)}>
                      Upload Result
                    </Button>
                  )}
                  {o.resultUrl ? (
                    <a
                      className="text-sm font-medium text-blue-700 underline underline-offset-2"
                      href={o.resultUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View file
                    </a>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {orders.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                No orders found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

export function LabOrdersKanban({
  orders,
  onChangeStatus,
  onUploadResult,
}: {
  orders: LabOrderListItem[]
  onChangeStatus: (id: string, status: LabStatus) => Promise<void>
  onUploadResult: (order: LabOrderListItem) => void
}) {
  const byStatus = STATUSES.reduce(
    (acc, st) => {
      acc[st] = orders.filter((o) => o.status === st)
      return acc
    },
    {} as Record<LabStatus, LabOrderListItem[]>
  )

  return (
    <DndContext
      onDragEnd={async (e: DragEndEvent) => {
        const orderId = String(e.active.id)
        const overId = e.over?.id ? String(e.over.id) : null
        if (!overId) return
        const targetStatus = overId.startsWith("col:") ? (overId.replace("col:", "") as LabStatus) : null
        if (!targetStatus) return
        const order = orders.find((o) => o.id === orderId)
        if (!order || order.status === targetStatus) return
        await onChangeStatus(orderId, targetStatus)
      }}
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {STATUSES.map((st) => (
          <KanbanColumn
            key={st}
            status={st}
            orders={byStatus[st]}
            onUploadResult={onUploadResult}
            onAdvance={onChangeStatus}
          />
        ))}
      </div>
    </DndContext>
  )
}

function KanbanColumn({
  status,
  orders,
  onAdvance,
  onUploadResult,
}: {
  status: LabStatus
  orders: LabOrderListItem[]
  onAdvance: (id: string, status: LabStatus) => Promise<void>
  onUploadResult: (order: LabOrderListItem) => void
}) {
  return (
    <div id={`col:${status}`} className="rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-800">{status.replaceAll("_", " ")}</div>
          <Badge variant="secondary">{orders.length}</Badge>
        </div>
      </div>
      <div className="p-3">
        <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orders.map((o) => (
              <KanbanCard key={o.id} order={o} onAdvance={onAdvance} onUploadResult={onUploadResult} />
            ))}
            {orders.length === 0 ? <div className="text-sm text-slate-500">No items</div> : null}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

function KanbanCard({
  order,
  onAdvance,
  onUploadResult,
}: {
  order: LabOrderListItem
  onAdvance: (id: string, status: LabStatus) => Promise<void>
  onUploadResult: (order: LabOrderListItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">{order.testName}</div>
          <div className="text-xs text-slate-600">{order.patient?.name ?? "—"}</div>
          <div className="text-xs text-slate-500">{new Date(order.orderedAt).toLocaleString()}</div>
        </div>
        <button
          className="cursor-grab rounded border bg-white px-2 py-1 text-xs text-slate-700"
          {...attributes}
          {...listeners}
          aria-label="Drag"
        >
          Drag
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {order.status !== "COMPLETED" ? (
          <Button size="sm" variant="outline" onClick={() => onAdvance(order.id, nextStatus(order.status))}>
            Move next
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onUploadResult(order)}>
            Upload Result
          </Button>
        )}
        {order.resultUrl ? (
          <a className="text-xs font-medium text-blue-700 underline underline-offset-2" href={order.resultUrl} target="_blank" rel="noreferrer">
            View file
          </a>
        ) : null}
        {order.resultUrl && labResultLooksPdf(order.resultUrl) ? (
          <div className="mt-3 w-full min-w-0 max-w-full">
            <PdfEmbedViewerDynamic src={order.resultUrl} title="Lab result PDF" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function UploadResultModal({
  open,
  setOpen,
  order,
  onSubmitted,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  order: LabOrderListItem | null
  onSubmitted: () => Promise<void>
}) {
  const [file, setFile] = React.useState<File | null>(null)
  const [summary, setSummary] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setFile(null)
      setSummary(order?.notes ?? "")
      setError(null)
      setBusy(false)
    }
  }, [open, order])

  if (!open || !order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">Upload result</div>
            <div className="text-sm text-slate-600">
              {order.testName} • {order.patient?.name ?? "—"}
            </div>
          </div>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-800">Result file (PDF/image, max 5MB)</div>
            <Input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-800">Text summary (optional)</div>
            <textarea
              className="min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          {error ? <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                const fd = new FormData()
                if (file) fd.set("file", file)
                if (summary.trim()) fd.set("summary", summary.trim())

                const res = await fetch(`/api/lab/orders/${order.id}/upload-result`, { method: "POST", body: fd })
                if (!res.ok) {
                  const j = (await res.json().catch(() => null)) as { error?: string } | null
                  throw new Error(j?.error || "Upload failed")
                }
                await onSubmitted()
                setOpen(false)
                toastSuccess("Lab result uploaded")
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Upload failed"
                setError(msg)
                toastError(msg)
              } finally {
                setBusy(false)
              }
            }}
            disabled={busy}
          >
            {busy ? "Submitting..." : "Submit Result"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function useLabOrders() {
  const { socket, connected } = useSocket()
  const [orders, setOrders] = React.useState<LabOrderListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<LabStatus | "ALL">("ALL")

  const load = React.useCallback(async () => {
    setLoading(true)
    const qs = statusFilter === "ALL" ? "" : `?status=${encodeURIComponent(statusFilter)}`
    const res = await fetch(`/api/lab/orders${qs}`, { cache: "no-store" })
    if (!res.ok) {
      toastError("Could not load lab orders")
      setLoading(false)
      return
    }
    const json = (await res.json()) as LabOrderListItem[]
    setOrders(json)
    setLoading(false)
  }, [statusFilter])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    if (!socket || !connected) return
    socket.emit("join", { room: "lab_orders" })
    const onUpdated = () => void load()
    socket.on("lab:order_updated", onUpdated)
    return () => {
      socket.off("lab:order_updated", onUpdated)
    }
  }, [socket, connected, load])

  return { orders, loading, statusFilter, setStatusFilter, reload: load }
}

export async function patchLabOrderStatus(id: string, status: LabStatus) {
  const res = await fetch(`/api/lab/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(j?.error || "Failed to update status")
  }
}

function nextStatus(current: LabStatus): LabStatus {
  if (current === "ORDERED") return "SAMPLE_COLLECTED"
  if (current === "SAMPLE_COLLECTED") return "PROCESSING"
  if (current === "PROCESSING") return "COMPLETED"
  return current
}

