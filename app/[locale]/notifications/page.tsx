"use client"

import React from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"
import { useSocket } from "@/components/shared/SocketProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type NotificationRow = {
  id: string
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
  title: string
  body: string | null
  readAt: string | null
  createdAt: string
}

function TypeIcon({ type }: { type: NotificationRow["type"] }) {
  const cls = "h-5 w-5 shrink-0"
  switch (type) {
    case "SUCCESS":
      return <CheckCircle2 className={cn(cls, "text-emerald-600")} />
    case "WARNING":
      return <AlertTriangle className={cn(cls, "text-amber-600")} />
    case "ERROR":
      return <XCircle className={cn(cls, "text-red-600")} />
    default:
      return <Info className={cn(cls, "text-sky-600")} />
  }
}

export default function NotificationsPage() {
  const { socket, connected } = useSocket()
  const [items, setItems] = React.useState<NotificationRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [typeFilter, setTypeFilter] = React.useState<"ALL" | NotificationRow["type"]>("ALL")

  const load = React.useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/notifications?limit=100", { cache: "no-store" })
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = (await res.json()) as { items: NotificationRow[] }
    setItems(data.items)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    if (!socket || !connected) return
    const onNew = () => void load()
    socket.on("notification:new", onNew)
    return () => {
      socket.off("notification:new", onNew)
    }
  }, [socket, connected, load])

  const filtered =
    typeFilter === "ALL" ? items : items.filter((n) => n.type === typeFilter)

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    })
    await load()
  }

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" })
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border bg-white px-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          >
            <option value="ALL">All types</option>
            <option value="INFO">Info</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-600">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-600">No notifications.</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-xl border bg-white p-4",
                !n.readAt && "border-sky-200 bg-sky-50/40"
              )}
            >
              <div className="flex gap-3">
                <TypeIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="text-base font-semibold text-slate-900">{n.title}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{n.type}</Badge>
                      {!n.readAt ? (
                        <Button size="sm" variant="outline" onClick={() => void markRead(n.id)}>
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {n.body ? <p className="mt-1 text-sm text-slate-700">{n.body}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
