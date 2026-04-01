"use client"

import { Link } from "@/i18n/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageSquare,
  Stethoscope,
  Users,
  Video,
  X,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter"

type Prompt = {
  appointmentId: string
  doctorName: string
  doctorPhotoUrl: string | null
  completedAt: string
}

type UpcomingAppt = {
  id: string
  startsAt: string
  tokenCode: string
  status: string
  doctorName: string
  departmentName: string
  consultationType?: string
}

type Summary = {
  stats: {
    appointmentsThisMonth: number
    consultationsDone: number
    pendingPayments: number
    familyCount: number
  }
  upcoming: UpcomingAppt[]
  queueLive: {
    appointmentId: string
    tokenCode: string
    doctorName: string
    departmentName: string
    startsAt: string
    nowServing: string | null
    yourToken: string
    ahead: number
    waitMinutes: number
    roomLabel: string
  } | null
  recentRecords: Array<{ id: string; createdAt: string; diagnosis: string; doctorName: string }>
}

type Dept = { id: string; code: string; name: string; floor: string; doctorsCount: number }

function MiniSpark() {
  const pts = [4, 7, 5, 9, 6, 10, 8]
  const max = Math.max(...pts)
  return (
    <svg className="mt-3 h-8 w-full text-[var(--mc-blue)]/40" preserveAspectRatio="none" viewBox="0 0 100 24">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        points={pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${24 - (p / max) * 20}`).join(" ")}
      />
    </svg>
  )
}

function canJoinVideo(startsAtIso: string) {
  const t = new Date(startsAtIso).getTime()
  return Math.abs(Date.now() - t) <= 60 * 60 * 1000
}

function greetingHour() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export default function PatientDashboard() {
  const { data: session } = useSession()
  const [feedbackPrompt, setFeedbackPrompt] = useState<Prompt | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [depts, setDepts] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)

  const a = useAnimatedCounter(summary?.stats.appointmentsThisMonth ?? 0, 1200, !!summary)
  const c = useAnimatedCounter(summary?.stats.consultationsDone ?? 0, 1200, !!summary)
  const p = useAnimatedCounter(summary?.stats.pendingPayments ?? 0, 1200, !!summary)
  const f = useAnimatedCounter(summary?.stats.familyCount ?? 0, 1200, !!summary)

  useEffect(() => {
    fetch("/api/patient/pending-feedback")
      .then((r) => r.json())
      .then((j) => {
        const d = j.success && j.data ? j.data : j
        if (d.prompt) setFeedbackPrompt(d.prompt)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      fetch("/api/patient/dashboard-summary", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ])
      .then(([s, d]) => {
        if (!s.error) setSummary(s as Summary)
        setDepts(Array.isArray(d) ? d : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = session?.user?.name?.split(/\s+/)[0] ?? "there"
  const today = new Date()
  const todayLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
  const apptsToday = summary?.upcoming.filter((x) => {
    const d = new Date(x.startsAt)
    return d.toDateString() === today.toDateString()
  }).length ?? 0

  return (
    <div className="space-y-6">
      {feedbackPrompt && !dismissed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-amber-950">
            <MessageSquare className="h-5 w-5 shrink-0" />
            <span>
              How was your visit with <strong>{feedbackPrompt.doctorName}</strong>? Your feedback helps us improve.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/feedback/${feedbackPrompt.appointmentId}`}
              className={cn(buttonVariants({ size: "sm" }), "rounded-xl bg-[var(--mc-blue)] text-white hover:bg-blue-700")}
            >
              Give feedback
            </Link>
            <button type="button" className="rounded-lg p-1 text-amber-900/70 hover:bg-amber-100" aria-label="Dismiss" onClick={() => setDismissed(true)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <section
        className="relative overflow-hidden rounded-2xl px-6 py-8 text-white shadow-xl shadow-slate-900/10"
        style={{ background: "var(--grad-navy)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 60%, white 0, transparent 40%)`,
          }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="mc-display text-2xl font-bold tracking-tight md:text-[28px]">
              {greetingHour()}, {firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-white/70">{todayLabel}</p>
            <p className="mt-3 text-base font-medium text-teal-300/95">
              You have {apptsToday} appointment{apptsToday === 1 ? "" : "s"} today
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/book"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/20"
            >
              Book Appointment
            </Link>
            <Link
              href="/queue"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/40 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View Queue
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--mc-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your dashboard…
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Calendar} label="Appointments this month" value={a} tone="blue" />
        <StatCard icon={CheckCircle2} label="Consultations done" value={c} tone="green" />
        <StatCard icon={CreditCard} label="Pending payments" value={p} tone="amber" />
        <StatCard icon={Users} label="Family members" value={f} tone="teal" />
      </div>

      {summary?.queueLive ? (
        <div
          className="grid gap-6 rounded-2xl p-6 text-white shadow-lg md:grid-cols-3"
          style={{ background: "var(--grad-blue)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Active queue</p>
            <p className="mt-2 text-lg font-bold">{summary.queueLive.doctorName}</p>
            <p className="text-sm text-white/75">{summary.queueLive.departmentName}</p>
            <p className="mt-2 text-sm text-white/70">{new Date(summary.queueLive.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="flex flex-col justify-center text-center md:border-x md:border-white/20">
            <p className="text-xs uppercase tracking-widest text-white/60">Now serving</p>
            <p className="mc-token mt-1 text-3xl font-black md:text-4xl">{summary.queueLive.nowServing ?? "—"}</p>
          </div>
          <div className="flex flex-col justify-center">
            <div className="rounded-2xl bg-white p-4 text-center shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mc-blue)]">Your token</p>
              <p className="mc-token mt-1 text-2xl font-black text-[var(--navy)]">{summary.queueLive.yourToken}</p>
              <p className="mt-2 text-xs text-[var(--mc-text-soft)]">
                {summary.queueLive.ahead} ahead · ~{summary.queueLive.waitMinutes} min
              </p>
              <Link
                href={`/queue/${summary.queueLive.appointmentId}`}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-3 w-full rounded-xl bg-[var(--mc-bg)] font-semibold text-[var(--mc-blue)] hover:bg-slate-100"
                )}
              >
                Track live →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[var(--mc-text)]">Upcoming appointments</h2>
              <p className="text-sm text-[var(--mc-muted)]">Your scheduled visits</p>
            </div>
            <Link href="/dashboard/book" className="text-sm font-semibold text-[var(--mc-blue)] hover:underline">
              Book
            </Link>
          </div>
          <ul className="mt-5 space-y-3">
            {(summary?.upcoming ?? []).length === 0 ? (
              <li className="rounded-2xl border border-dashed border-[var(--mc-border)] bg-[var(--mc-bg)] px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-inner">
                  <Calendar className="h-8 w-8 text-[var(--mc-muted)]" />
                </div>
                <p className="font-semibold text-[var(--mc-text)]">No upcoming appointments</p>
                <Link href="/dashboard/book" className="mt-3 inline-block text-sm font-semibold text-[var(--mc-blue)] hover:underline">
                  Book your first appointment →
                </Link>
              </li>
            ) : (
              (summary?.upcoming ?? []).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--mc-border)] p-4 transition hover:border-[var(--mc-blue)]/30 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--mc-blue)]">
                      <Stethoscope className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--mc-text)]">{a.doctorName}</p>
                      <p className="text-sm text-[var(--mc-muted)]">{a.departmentName}</p>
                      <p className="mt-1 text-xs text-[var(--mc-text-soft)]">
                        {new Date(a.startsAt).toLocaleString()} · <span className="mc-token">{a.tokenCode}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.status} />
                    {a.status === "CONFIRMED" || a.status === "IN_PROGRESS" ? (
                      <Link
                        href={`/queue/${a.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl border-[var(--mc-blue)]/40 text-[var(--mc-blue)]")}
                      >
                        Track queue
                      </Link>
                    ) : null}
                    {a.consultationType === "VIDEO" && canJoinVideo(a.startsAt) ? (
                      <Link
                        href={`/video/${a.id}`}
                        className={cn(buttonVariants({ size: "sm" }), "rounded-xl gap-1 bg-[var(--mc-blue)] text-white hover:bg-blue-700")}
                      >
                        <Video className="h-3.5 w-3.5" /> Video
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--mc-text)]">Quick book</h2>
            <p className="text-sm text-[var(--mc-muted)]">Choose a department</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {depts.slice(0, 6).map((d) => (
                <Link
                  key={d.id}
                  href={`/book?departmentId=${d.id}`}
                  className="group rounded-xl border border-[var(--mc-border)] p-3 text-center transition hover:border-[var(--mc-blue)] hover:bg-blue-50/50"
                >
                  <div className="text-2xl" aria-hidden>
                    🏥
                  </div>
                  <p className="mt-2 text-xs font-bold leading-tight text-[var(--mc-text)]">{d.name}</p>
                  <p className="text-[10px] text-[var(--mc-muted)]">{d.doctorsCount} doctors</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--mc-text)]">Recent records</h2>
              <Link href="/dashboard/records" className="text-sm font-semibold text-[var(--mc-blue)] hover:underline">
                View all →
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {(summary?.recentRecords ?? []).length === 0 ? (
                <p className="text-sm text-[var(--mc-muted)]">No records yet.</p>
              ) : (
                (summary?.recentRecords ?? []).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--mc-bg)] px-3 py-2">
                    <div>
                      <p className="text-xs text-[var(--mc-muted)]">{new Date(r.createdAt).toLocaleDateString()}</p>
                      <p className="text-sm font-medium text-[var(--mc-text)]">{r.doctorName}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--mc-blue)] ring-1 ring-[var(--mc-border)]">
                      {r.diagnosis}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Calendar
  label: string
  value: number
  tone: "blue" | "green" | "amber" | "teal"
}) {
  const ring =
    tone === "blue"
      ? "bg-blue-50 text-[var(--mc-blue)]"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-600"
        : tone === "amber"
          ? "bg-amber-50 text-amber-600"
          : "bg-teal-50 text-teal-600"
  return (
    <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", ring)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-[var(--mc-text)]">{value}</p>
          <p className="text-xs font-medium text-[var(--mc-muted)]">{label}</p>
        </div>
      </div>
      <MiniSpark />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "CONFIRMED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
        <span className="status-pulse-dot h-1.5 w-1.5 rounded-full bg-blue-500" />
        Confirmed
      </span>
    )
  if (status === "COMPLETED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Done
      </span>
    )
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{status}</span>
  )
}
