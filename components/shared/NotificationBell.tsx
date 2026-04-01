"use client"

import React from "react"
import { useRouter } from "@/i18n/navigation"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from "lucide-react"
import { useSocket } from "@/components/shared/SocketProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  const cls = "h-4 w-4 shrink-0"
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

export function NotificationBell() {
  const router = useRouter()
  const { socket, connected } = useSocket()
  const [items, setItems] = React.useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [marking, setMarking] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/notifications?limit=10", { cache: "no-store" })
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = (await res.json()) as { items: NotificationRow[]; unreadCount: number }
    setItems(data.items)
    setUnreadCount(data.unreadCount)
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

  const markAllRead = async () => {
    setMarking(true)
    try {
      await fetch("/api/notifications/read-all", { method: "POST" })
      await load()
    } finally {
      setMarking(false)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Notifications" />}
      >
        <span className="relative inline-flex">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <Badge className="absolute -top-2 -right-2 min-w-5 justify-center px-1 py-0 text-[10px] bg-sky-600">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={marking}
              onClick={(e) => {
                e.preventDefault()
                void markAllRead()
              }}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet.</div>
          ) : (
            <ul className="py-1">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "border-b border-slate-100 px-3 py-2 last:border-0",
                    !n.readAt && "bg-sky-50/60"
                  )}
                >
                  <div className="flex gap-2">
                    <TypeIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900">{n.title}</div>
                      {n.body ? <div className="text-xs text-slate-600 line-clamp-2">{n.body}</div> : null}
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          className="cursor-pointer justify-center text-sky-700"
          onClick={() => {
            setOpen(false)
            router.push("/notifications")
          }}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
