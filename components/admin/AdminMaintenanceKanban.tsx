"use client"

import { formatDistanceToNow } from "date-fns"
import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type Item = {
  id: string
  location: string
  description: string
  priority: string
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED"
  createdAt: string
  reporter: { id: string; name: string; email: string }
  assignee: { id: string; name: string } | null
}

type Assignee = { id: string; name: string; email: string; role: string }

const COLUMNS: Item["status"][] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]

export function AdminMaintenanceKanban() {
  const [items, setItems] = useState<Item[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/maintenance")
    const j = await res.json()
    if (res.ok) {
      setItems(j.items)
      setAssignees(j.assignees)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function patch(id: string, body: { status?: Item["status"]; assigneeId?: string | null }) {
    const res = await fetch(`/api/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) void load()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => (
        <div key={col} className="space-y-3 min-h-[200px]">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{col.replace("_", " ")}</h2>
          <div className="space-y-3">
            {items
              .filter((i) => i.status === col)
              .map((item) => (
                <Card key={item.id} className="border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{item.location}</CardTitle>
                      <Badge
                        variant={
                          item.priority === "EMERGENCY" || item.priority === "CRITICAL"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {item.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    <p className="line-clamp-3">{item.description}</p>
                    <p className="text-xs text-slate-500">
                      Reporter: {item.reporter.name} ·{" "}
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Assign
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {assignees.map((a) => (
                            <DropdownMenuItem
                              key={a.id}
                              onClick={() => void patch(item.id, { assigneeId: a.id })}
                            >
                              {a.name} ({a.role})
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => void patch(item.id, { assigneeId: null })}>
                            Unassign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                        >
                          Status
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {COLUMNS.filter((s) => s !== item.status).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => void patch(item.id, { status: s })}>
                              {s.replace("_", " ")}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
