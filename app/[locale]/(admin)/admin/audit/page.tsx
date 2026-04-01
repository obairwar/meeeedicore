"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LogRow = {
  id: string
  timestamp: string
  userName: string
  action: string
  resource: string
  ipAddress: string | null
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [suspicious, setSuspicious] = useState<{ userId: string; accessesInHour: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [action, setAction] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (userId) q.set("userId", userId)
    if (action) q.set("action", action)
    if (from) q.set("from", from)
    if (to) q.set("to", to)
    const res = await fetch(`/api/admin/audit?${q}`)
    const j = await res.json()
    setLogs(j.logs ?? [])
    setSuspicious(j.suspicious ?? [])
    setLoading(false)
  }, [userId, action, from, to])

  useEffect(() => {
    void load()
  }, [load])

  function exportCsv() {
    const lines: string[] = [["timestamp", "user", "action", "resource", "ip"].join(",")]
    for (const l of logs) {
      lines.push(
        [l.timestamp, l.userName, l.action, l.resource, l.ipAddress ?? ""].map((c) => `"${c}"`).join(",")
      )
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "audit.csv"
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
          <p className="text-sm text-slate-600">Administrative actions and access patterns.</p>
        </div>
        <Button variant="outline" type="button" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-lg border bg-white p-4">
        <div className="space-y-1">
          <Label>User ID</Label>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Filter…" />
        </div>
        <div className="space-y-1">
          <Label>Action</Label>
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="contains…" />
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="button" className="bg-sky-600 hover:bg-sky-700" onClick={() => void load()}>
          Apply
        </Button>
      </div>

      {suspicious.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold text-amber-900 mb-2">Suspicious activity</div>
          <p className="text-sm text-amber-800 mb-2">Users with &gt;50 audit events in the last hour.</p>
          <ul className="text-sm space-y-1">
            {suspicious.map((s) => (
              <li key={s.userId}>
                User <code className="bg-white/50 px-1 rounded">{s.userId}</code> — {s.accessesInHour} events
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Resource</th>
                <th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{l.timestamp}</td>
                  <td className="p-3">{l.userName}</td>
                  <td className="p-3">{l.action}</td>
                  <td className="p-3 text-xs">{l.resource}</td>
                  <td className="p-3 text-xs">{l.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
