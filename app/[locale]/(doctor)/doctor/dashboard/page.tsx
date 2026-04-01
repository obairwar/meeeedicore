"use client"

import { useEffect, useState } from "react"
import { Loader2, Video } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import { calculateAge, cn } from "@/lib/utils"
import { useSocket } from "@/components/shared/SocketProvider"
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter"
import { useSession } from "next-auth/react"

type DoctorDashboardData = {
  doctorId: string
  stats: { totalBooked: number; completed: number; pending: number; avgConsultMinutes: number }
  nextPatient:
    | null
    | {
        queueEntryId: string
        appointmentId: string
        tokenCode: string
        patientName: string
        patientDob: string | null
        symptoms: string
        consultationType?: string
        priority?: string
      }
  queue: Array<{
    id: string
    appointmentId: string
    tokenCode: string
    patientName: string
    patientDob: string | null
    symptoms: string
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "EMERGENCY"
    status: string
    consultationType?: string
  }>
}

type CurrentServing = {
  id: string
  tokenCode: string
  priority: string
  symptoms: string
  patient: { name: string }
  queueEntry?: { startedAt: string | Date | null } | null
} | null

type QueueApi = {
  success?: boolean
  data?: {
    currentlyServing: CurrentServing
  }
}

function priorityTone(p: string) {
  if (p === "EMERGENCY" || p === "CRITICAL") return { bar: "bg-[var(--emergency)]", badge: "bg-red-600 text-white", label: "EMERGENCY" }
  if (p === "HIGH") return { bar: "bg-[var(--urgent)]", badge: "bg-amber-500 text-black", label: "URGENT" }
  if (p === "IN_CONSULTATION" || p === "IN_PROGRESS") return { bar: "bg-[var(--mc-blue)]", badge: "bg-blue-600 text-white", label: "LIVE" }
  return { bar: "bg-transparent", badge: "bg-slate-600 text-white", label: p }
}

export default function DoctorDashboard() {
  const { data: session } = useSession()
  const { socket, connected } = useSocket()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DoctorDashboardData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [consultingNow, setConsultingNow] = useState<CurrentServing>(null)
  const [consultingElapsed, setConsultingElapsed] = useState(0)

  const s1 = useAnimatedCounter(data?.stats?.totalBooked ?? 0, 1200, !!data)
  const s2 = useAnimatedCounter(data?.stats?.completed ?? 0, 1200, !!data)
  const s3 = useAnimatedCounter(data?.stats?.pending ?? 0, 1200, !!data)
  const s4 = useAnimatedCounter(data?.stats?.avgConsultMinutes ?? 0, 1200, !!data)

  async function refresh() {
    setLoadError(null)
    const r = await fetch(`/api/doctor/dashboard`, { cache: "no-store" })
    const j = (await r.json()) as { success?: boolean; data?: DoctorDashboardData; error?: string }
    if (!r.ok || j.success === false) {
      setLoadError(j.error ?? "Failed to load dashboard")
      setData(null)
    } else {
      setData(j.success && j.data ? j.data : (j as unknown as DoctorDashboardData))
    }
    setLoading(false)
  }

  async function refreshConsulting(doctorId: string) {
    const r = await fetch(`/api/queue/${doctorId}`, { cache: "no-store" })
    const j = (await r.json()) as QueueApi
    if (!r.ok || j.success === false) {
      setConsultingNow(null)
      return
    }
    setConsultingNow(j.data?.currentlyServing ?? null)
  }

  useEffect(() => {
    setTimeout(() => void refresh(), 0)
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!data?.doctorId) return
    setTimeout(() => void refreshConsulting(data.doctorId), 0)
    const t = setInterval(() => void refreshConsulting(data.doctorId), 8000)
    return () => clearInterval(t)
  }, [data?.doctorId])

  useEffect(() => {
    const startedAt = consultingNow?.queueEntry?.startedAt
    if (!startedAt) return

    const update = () => {
      const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
      setConsultingElapsed(mins)
    }
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [consultingNow?.queueEntry?.startedAt])

  useEffect(() => {
    if (!socket || !connected || !data?.doctorId) return
    socket.emit("join", { room: data.doctorId })
    const onUpdated = () => void refresh()
    socket.on("queue:updated", onUpdated)
    return () => {
      socket.off("queue:updated", onUpdated)
    }
  }, [socket, connected, data?.doctorId])

  async function callNext() {
    if (!data?.doctorId) return
    await fetch(`/api/queue/${data.doctorId}/call-next`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomNumber: "204" }),
    })
    await refresh()
  }

  const docName = session?.user?.name?.replace(/^Dr\.\s*/i, "") ?? "Doctor"
  const greeting = docName.startsWith("Dr") ? session?.user?.name ?? "Doctor" : `Dr. ${docName}`

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-2xl px-6 py-8 text-white shadow-xl"
        style={{ background: "var(--grad-navy)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mc-display text-2xl font-bold md:text-3xl">Good morning, {greeting} 👨‍⚕️</h1>
            <p className="mt-2 text-teal-200/90">
              You have {data?.stats?.totalBooked ?? "—"} patients scheduled today
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white/30 bg-white/10 text-xl font-bold">
            {session?.user?.name?.[0] ?? "D"}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-[var(--mc-muted)]">
          <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500 status-pulse-dot" : "bg-amber-400")} />
          {connected ? "Live" : "Polling"}
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      {loadError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--mc-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatMini label="Today's total" value={s1} />
        <StatMini label="Completed" value={s2} sub="visits" />
        <StatMini label="Remaining" value={s3} />
        <StatMini label="Avg time" value={s4} suffix="m" />
      </div>

      <div
        className="overflow-hidden rounded-2xl p-6 text-white shadow-lg"
        style={{ background: "var(--grad-blue)" }}
      >
        {consultingNow ? (
          <div className="mb-4 rounded-xl bg-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 status-pulse-dot" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">Consulting now</span>
              </div>
              <div className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-mono font-bold text-white">
                {consultingElapsed}m <span className="font-sans font-semibold text-white/70">elapsed</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{consultingNow.patient.name}</p>
                <p className="mc-token truncate text-xs text-white/70">{consultingNow.tokenCode}</p>
              </div>
              <Button
                className="h-9 rounded-xl bg-white text-[var(--mc-blue)] hover:bg-slate-100"
                onClick={() => alert("Consultation notes UI coming soon")}
              >
                Open Notes
              </Button>
            </div>
          </div>
        ) : null}
        <Badge className="mb-4 rounded-lg bg-teal-500/30 text-xs font-bold uppercase tracking-wider text-teal-100">Up next</Badge>
        {data?.nextPatient ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
                {data.nextPatient.patientName[0]}
              </div>
              <div>
                <p className="text-xl font-bold">{data.nextPatient.patientName}</p>
                <p className="text-sm text-white/75">
                  Age {data.nextPatient.patientDob ? calculateAge(new Date(data.nextPatient.patientDob)) : "—"} · Blood group on file
                </p>
                <p className="mc-token mt-2 text-sm text-white/60">{data.nextPatient.tokenCode}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-white/10 p-3 text-sm leading-relaxed">{data.nextPatient.symptoms}</div>
              <Button
                className="mc-btn-primary h-11 w-full rounded-xl bg-white font-semibold text-[var(--mc-blue)] hover:bg-slate-100"
                onClick={callNext}
              >
                Call this patient
              </Button>
              <Button variant="ghost" className="w-full text-white/80 hover:bg-white/10 hover:text-white" onClick={() => alert("Skip flow coming soon")}>
                Skip →
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/10 px-4 py-8 text-center">
            <p className="text-lg font-semibold">🎉 Queue is empty for today</p>
            <Badge className="mt-3 bg-emerald-500/40 text-white">All caught up</Badge>
          </div>
        )}
      </div>

      <Card className="rounded-2xl border-[var(--mc-border)] shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-[var(--mc-border)] bg-[var(--mc-bg)]/50">
          <CardTitle className="text-lg">Today&apos;s queue</CardTitle>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--mc-muted)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 status-pulse-dot" />
            Auto-refreshing · {data?.queue?.length ?? 0} in list
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-[var(--mc-muted)]">
              <tr className="border-b border-[var(--mc-border)]">
                <th className="w-2 p-0" />
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Token</th>
                <th className="px-3 py-3">Patient</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Symptoms</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.queue ?? []).map((q) => {
                const pt = priorityTone(q.priority)
                const consulting = q.status === "IN_CONSULTATION" || q.status === "IN_PROGRESS"
                return (
                  <tr
                    key={q.id}
                    className={cn(
                      "group border-b border-[var(--mc-border)] transition-colors",
                      consulting && "bg-blue-50/80",
                      !consulting && "hover:bg-blue-500/[0.04]"
                    )}
                  >
                    <td className={cn("w-1 p-0", pt.bar)} />
                    <td className="px-3 py-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {q.tokenCode.split("-").pop()}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="mc-token font-semibold text-[var(--mc-blue)]">{q.tokenCode}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold text-[var(--mc-text)]">{q.patientName}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {q.patientDob ? calculateAge(new Date(q.patientDob)) : "—"}y
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={cn("rounded-lg text-[10px] font-bold", pt.badge)}>{q.priority}</Badge>
                      {consulting ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          <span className="status-pulse-dot h-1.5 w-1.5 rounded-full bg-white" />
                          CONSULTING
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-[var(--mc-text-soft)]" title={q.symptoms}>
                      {q.symptoms}
                    </td>
                    <td className="px-3 py-3 text-right opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <div className="flex flex-wrap justify-end gap-1">
                        {q.consultationType === "VIDEO" ? (
                          <Link
                            href={`/video/${q.appointmentId}`}
                            className={cn(buttonVariants({ size: "sm" }), "rounded-lg bg-[var(--mc-blue)] text-white hover:bg-blue-700")}
                          >
                            <Video className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => alert("History coming soon")}>
                          History
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => alert("Mark urgent coming soon")}>
                          Urgent
                        </Button>
                        <Button size="sm" variant="destructive" className="rounded-lg text-xs" onClick={() => alert("No-show flow coming soon")}>
                          No show
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatMini({ label, value, sub, suffix }: { label: string; value: number; sub?: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mc-muted)]">{label}</p>
      <p className="mc-display mt-1 text-3xl font-bold tabular-nums text-[var(--mc-text)]">
        {value}
        {suffix ? <span className="text-lg font-semibold text-[var(--mc-muted)]">{suffix}</span> : null}
      </p>
      {sub ? <p className="text-xs text-[var(--mc-muted)]">{sub}</p> : null}
    </div>
  )
}
