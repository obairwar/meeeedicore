"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Link } from "@/i18n/navigation"
import { Loader2, RefreshCw } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type QueueRow = {
  appointmentId: string
  position: number
  tokenCode: string
  patientName: string
  priority: string
  priorityLabel: string
  estimatedWaitMinutes: number
  doctorName: string
}

type DeptCard = {
  id: string
  name: string
  floor: string
  roomNumbers: string[]
  currentlyServing: { tokenCode: string; patientName: string; doctorName: string } | null
  queue: QueueRow[]
  queueLength: number
  completedToday: number
}

type StatsPayload = {
  totalToday: number
  inQueue: number
  beingServed: number
  completed: number
  noShows: number
  departments: DeptCard[]
  recentRegistrations: Array<{
    id: string
    patientName: string
    tokenCode: string
    department: string
    createdAt: string
    status: string
  }>
}

function rowBg(priorityLabel: string) {
  if (priorityLabel === "EMERGENCY") return "border-l-4 border-l-red-500 bg-red-50/80"
  if (priorityLabel === "URGENT") return "border-l-4 border-l-amber-500 bg-amber-50/80"
  return "border-l-4 border-l-transparent bg-white hover:bg-blue-500/[0.03]"
}

export default function ReceptionistDashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{
    patientName: string
    tokenCode: string
    doctorName: string
    departmentName: string
    status: string
    startsAt: string
  } | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const r = await fetch("/api/receptionist/stats", { cache: "no-store" })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? "Failed")
      setData(j as StatsPayload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 20000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!detailId) {
      setDetail(null)
      return
    }
    fetch(`/api/receptionist/appointments/${detailId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.appointment) {
          const a = j.appointment
          setDetail({
            patientName: a.patientName,
            tokenCode: a.tokenCode,
            doctorName: a.doctorName,
            departmentName: a.departmentName,
            status: a.status,
            startsAt: a.startsAt,
          })
        }
      })
      .catch(() => setDetail(null))
  }, [detailId])

  async function post(path: string, body: Record<string, string>) {
    setActionId(body.appointmentId ?? path)
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? r.statusText)
      }
      await load()
    } finally {
      setActionId(null)
    }
  }

  const deskDate = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 p-6 text-[var(--mc-muted)]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl px-6 py-7 text-white shadow-xl"
        style={{ background: "var(--grad-navy)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mc-display text-2xl font-bold md:text-3xl">Reception Desk — {session?.user?.name ?? "Staff"}</h1>
            <p className="mt-2 text-sm text-teal-200/90">
              {deskDate} · MediCore General Hospital
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => void load()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link
              href="/receptionist/walkin"
              className={cn(
                buttonVariants(),
                "rounded-xl border-0 bg-white font-semibold text-[var(--navy)] hover:bg-slate-100"
              )}
            >
              Add walk-in +
            </Link>
          </div>
        </div>
      </section>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}

      {data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total today" value={data.totalToday} tone="blue" />
          <Stat label="In queue" value={data.inQueue} tone="teal" />
          <Stat label="Consulting" value={data.beingServed} tone="amber" />
          <Stat label="Completed" value={data.completed} tone="green" />
          <Stat label="No-shows" value={data.noShows} tone="red" />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          {(data?.departments ?? []).map((d) => (
            <Card key={d.id} className="rounded-2xl border-[var(--mc-border)] shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 border-b border-[var(--mc-border)] bg-[var(--mc-bg)]/40 pb-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[var(--mc-blue)]">
                    <span className="text-lg font-bold">🏥</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg text-[var(--mc-text)]">{d.name}</CardTitle>
                    <p className="mt-1 text-xs text-[var(--mc-muted)]">
                      <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-medium">Floor {d.floor}</span>{" "}
                      · Rooms {d.roomNumbers.join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-[var(--mc-blue)]/10 text-[var(--mc-blue)] hover:bg-[var(--mc-blue)]/15">
                    Live · {d.queueLength}
                  </Badge>
                  <Link
                    href="/receptionist/walkin"
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "rounded-full border-[var(--mc-blue)] text-[var(--mc-blue)]"
                    )}
                  >
                    Add walk-in +
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="rounded-xl bg-[var(--navy)]/5 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mc-muted)]">Now serving</div>
                  {d.currentlyServing ? (
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span className="mc-token text-2xl font-black text-[var(--navy)]">{d.currentlyServing.tokenCode}</span>
                      <span className="text-sm text-[var(--mc-text-soft)]">
                        {d.currentlyServing.patientName} · {d.currentlyServing.doctorName}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-[var(--mc-muted)]">None</div>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--mc-border)]">
                  {d.queue.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">No patients waiting</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {d.queue.map((q) => (
                        <li
                          key={q.appointmentId}
                          className={cn(
                            "group flex flex-col gap-2 border-b border-[var(--mc-border)] p-3 text-sm transition sm:flex-row sm:items-center sm:justify-between",
                            rowBg(q.priorityLabel)
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="mc-token font-bold text-[var(--mc-text)]">#{q.position}</span>
                            <span className="mc-token text-[var(--mc-blue)]">{q.tokenCode}</span>
                            <span className="font-medium">{q.patientName}</span>
                            <Badge variant="outline">{q.priorityLabel}</Badge>
                            <span className="text-slate-500">~{q.estimatedWaitMinutes} min</span>
                            <span className="text-xs text-slate-500">{q.doctorName}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg text-xs"
                              disabled={actionId === q.appointmentId}
                              onClick={() => void post("/api/receptionist/queue/prioritize", { appointmentId: q.appointmentId })}
                            >
                              ↑
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={actionId === q.appointmentId}
                              onClick={() => void post("/api/receptionist/queue/skip", { appointmentId: q.appointmentId })}
                            >
                              Skip
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-amber-800"
                              disabled={actionId === q.appointmentId}
                              onClick={() => void post("/api/receptionist/queue/no-show", { appointmentId: q.appointmentId })}
                            >
                              No show
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 bg-sky-600 text-xs hover:bg-sky-700"
                              disabled={actionId === q.appointmentId}
                              onClick={() =>
                                void post("/api/receptionist/queue/call", {
                                  appointmentId: q.appointmentId,
                                  roomNumber: d.roomNumbers[0] ?? "101",
                                })
                              }
                            >
                              Call
                            </Button>
                            <Link
                              href={`/receptionist/token/${q.appointmentId}`}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "h-7 text-xs")}
                            >
                              Print token
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  className="mc-btn-primary h-11 w-full rounded-xl font-semibold text-white shadow-md"
                  style={{ background: "var(--grad-teal)" }}
                  disabled={!!actionId}
                  onClick={() => void post("/api/receptionist/queue/call-next-department", { departmentId: d.id })}
                >
                  Call next patient
                </Button>
                <p className="text-center text-xs text-[var(--mc-muted)]">Next in queue for department doctors</p>
                <div className="text-xs text-[var(--mc-muted)]">Completed today in dept: {d.completedToday}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-24 rounded-2xl border-[var(--mc-border)] shadow-sm">
            <CardHeader className="border-b border-[var(--mc-border)]">
              <CardTitle className="text-base text-[var(--mc-text)]">Today&apos;s registrations</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto pt-4">
              {(data?.recentRegistrations ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">None today</p>
              ) : (
                <ul className="space-y-2">
                  {(data?.recentRegistrations ?? []).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => setDetailId(r.id)}
                      >
                        <div className="font-medium">{r.patientName}</div>
                        <div className="text-xs text-slate-500">
                          {r.tokenCode} · {r.department}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {r.status}
                          </Badge>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="lg:hidden">
        <Card className="rounded-2xl border-[var(--mc-border)]">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentRegistrations ?? []).length === 0 ? (
              <p className="text-sm text-[var(--mc-muted)]">None today</p>
            ) : (
              <ul className="space-y-2">
                {(data?.recentRegistrations ?? []).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-[var(--mc-border)] bg-white p-3 text-left text-sm hover:bg-[var(--mc-bg)]"
                      onClick={() => setDetailId(r.id)}
                    >
                      <div className="font-medium text-[var(--mc-text)]">{r.patientName}</div>
                      <div className="text-xs text-[var(--mc-muted)]">
                        {r.tokenCode} · {r.department}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {detailId && detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Appointment</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Patient</dt>
                <dd className="font-medium">{detail.patientName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Token</dt>
                <dd className="font-mono">{detail.tokenCode}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Doctor / Dept</dt>
                <dd>
                  {detail.doctorName} · {detail.departmentName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Time</dt>
                <dd>{new Date(detail.startsAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>{detail.status}</dd>
              </div>
            </dl>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setDetailId(null)}>
                Close
              </Button>
              <Link
                href={`/receptionist/token/${detailId}`}
                target="_blank"
                className={cn(buttonVariants(), "bg-sky-600 text-white hover:bg-sky-700")}
              >
                Print token
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "blue" | "teal" | "amber" | "green" | "red" }) {
  const dot =
    tone === "blue"
      ? "bg-blue-500"
      : tone === "teal"
        ? "bg-teal-500"
        : tone === "amber"
          ? "bg-amber-500"
          : tone === "green"
            ? "bg-emerald-500"
            : "bg-red-500"
  return (
    <Card className="rounded-2xl border-[var(--mc-border)] shadow-sm">
      <CardContent className="flex items-center gap-3 pt-5">
        <span className={cn("h-10 w-1.5 shrink-0 rounded-full", dot)} />
        <div>
          <div className="text-2xl font-bold tabular-nums text-[var(--mc-text)]">{value}</div>
          <div className="text-xs font-medium text-[var(--mc-muted)]">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
