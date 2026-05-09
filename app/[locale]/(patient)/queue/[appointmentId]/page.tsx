"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { useSocket } from "@/components/shared/SocketProvider"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn, formatExpectedTime, formatWaitTime } from "@/lib/utils"

interface QueueStatus {
  tokenCode: string
  tokenNumber: number
  status: string
  doctorId: string
  appointmentStartsAt: string
  queueIsLiveToday: boolean
  position: number
  estimatedWaitMinutes: number
  patientsAhead: number
  waitingAhead: number
  timeRemainingForCurrent: number
  estimatedAppointmentTime: string
  currentlyServing: {
    tokenCode: string | null
    patientName: string | null
    startedAt: string | null
    elapsedMinutes: number
    timeRemaining: number
  }
  doctorName: string
  department: string
  roomNumber: string
  slotDurationMinutes: number
}

export default function PatientQueuePage() {
  const params = useParams<{ locale?: string; appointmentId?: string | string[] }>()
  const appointmentId =
    typeof params.appointmentId === "string"
      ? params.appointmentId
      : Array.isArray(params.appointmentId)
        ? params.appointmentId[0]
        : ""

  const { socket, connected } = useSocket()
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(15)
  const prevTokenRef = useRef<string | null>(null)
  const [tokenFlash, setTokenFlash] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const fetchStatus = useCallback(async () => {
    if (!appointmentId) {
      setError("Missing appointment id in URL.")
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/queue/status/${appointmentId}`, { cache: "no-store" })
      const json = (await res.json()) as {
        success?: boolean
        data?: QueueStatus
        error?: string | null
      }
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? (res.status === 404 ? "Appointment not found" : "Failed to load queue status"))
        if (!json.data) setStatus(null)
      } else {
        if (prevTokenRef.current && prevTokenRef.current !== json.data.currentlyServing.tokenCode) {
          setTokenFlash(true)
          setTimeout(() => setTokenFlash(false), 600)
        }
        prevTokenRef.current = json.data.currentlyServing.tokenCode
        setStatus(json.data)
        setError("")
        setLastUpdated(new Date())
        setSecondsUntilRefresh(15)
      }
    } catch {
      setError("Network error. Retrying…")
    } finally {
      setLoading(false)
    }
  }, [appointmentId])

  useEffect(() => {
    void fetchStatus()
    const pollInterval = setInterval(() => void fetchStatus(), 15000)
    return () => clearInterval(pollInterval)
  }, [fetchStatus])

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsUntilRefresh((s) => (s <= 1 ? 15 : s - 1))
    }, 1000)
    return () => clearInterval(countdown)
  }, [])

  useEffect(() => {
    if (!socket || !connected || !appointmentId) return

    // Subscribe this page to the relevant rooms so it receives doctor queue updates
    // and patient-specific events.
    socket.emit("join", { room: appointmentId })

    const onUpdate = () => void fetchStatus()
    socket.on("queue:updated", onUpdate)
    socket.on("patient:your_turn", onUpdate)
    socket.on("patient:alert_2_ahead", onUpdate)
    return () => {
      socket.off("queue:updated", onUpdate)
      socket.off("patient:your_turn", onUpdate)
      socket.off("patient:alert_2_ahead", onUpdate)
    }
  }, [socket, connected, appointmentId, fetchStatus])

  useEffect(() => {
    if (!socket || !connected) return
    if (!status?.doctorId) return
    socket.emit("join", { room: status.doctorId })
  }, [socket, connected, status?.doctorId])

  // Keep the elapsed timer in sync with server state (and then count up locally)
  useEffect(() => {
    if (!status) return
    setElapsed(status.currentlyServing.elapsedMinutes)
  }, [status])

  useEffect(() => {
    const startedAt = status?.currentlyServing.startedAt
    if (!startedAt) return
    const interval = setInterval(() => {
      const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
      setElapsed(mins)
    }, 30000)
    return () => clearInterval(interval)
  }, [status?.currentlyServing.startedAt])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mc-bg)]">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[var(--mc-blue)]" />
          <p className="font-medium text-[var(--mc-text-soft)]">Loading queue status…</p>
        </div>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mc-bg)] p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--mc-border)] bg-white p-8 text-center shadow-lg">
          <p className="text-lg font-bold text-[var(--emergency)]">Something went wrong</p>
          <p className="mt-2 text-sm text-[var(--mc-muted)]">{error}</p>
          <Button className="mt-6 h-11 w-full rounded-xl" onClick={() => void fetchStatus()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!status) return null
  const queueNotLive = !status.queueIsLiveToday

  const isYourTurn = status.status === "IN_PROGRESS"
  const isCompleted = status.status === "COMPLETED"
  const almostYourTurn = status.patientsAhead <= 2 && status.patientsAhead > 0 && !isYourTurn
  const slotM = status.slotDurationMinutes ?? 15
  const waitingAhead = Math.max(0, status.waitingAhead ?? Math.max(0, status.patientsAhead - (status.currentlyServing.tokenCode ? 1 : 0)))

  const progressPercent = isYourTurn
    ? 100
    : status.position <= 0
      ? 100
      : Math.min(100, Math.max(0, Math.round(((status.position - status.patientsAhead) / status.position) * 100)))

  if (isCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mc-bg)] p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--mc-border)] bg-white p-8 text-center shadow-lg">
          <div className="text-5xl">✅</div>
          <h2 className="mc-display mt-4 text-2xl font-bold text-[var(--mc-text)]">Consultation complete</h2>
          <p className="mt-2 text-sm text-[var(--mc-muted)]">Your visit with {status.doctorName} is done.</p>
          <Link
            href="/dashboard/records"
            className={cn(buttonVariants(), "mt-6 block h-11 w-full rounded-xl bg-[var(--mc-blue)] hover:bg-blue-700")}
          >
            View medical records
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--mc-bg)] pb-10">
      <header
        className="sticky top-0 z-20 flex h-20 items-center justify-between gap-3 px-4 text-white shadow-md"
        style={{ background: "var(--grad-navy)" }}
      >
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-lg p-2 hover:bg-white/10" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold">Queue Status</span>
        </div>
        <div className="mc-display text-sm font-bold tracking-tight">MediCore</div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="status-pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
          Live
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-sm space-y-4 px-4">
        {queueNotLive ? (
          <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-4 text-center text-sm text-[var(--mc-muted)] shadow-sm">
            Queue updates go live on your appointment day.
          </div>
        ) : null}
        {connected ? (
          <p className="text-center text-xs text-[var(--mc-muted)]">Socket connected — instant updates when available</p>
        ) : null}

        {isYourTurn ? (
          <div className="emergency-pulse rounded-2xl p-6 text-center text-white shadow-xl" style={{ background: "var(--grad-emergency)" }}>
            <div className="text-5xl">🚨</div>
            <p className="mc-display mt-3 text-2xl font-black">IT&apos;S YOUR TURN!</p>
            <p className="mt-2 text-sm text-white/90">Proceed to Room {status.roomNumber} immediately</p>
          </div>
        ) : null}

        {almostYourTurn ? (
          <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-center text-amber-950 shadow-lg">
            <p className="text-xl font-bold">⏰ Almost your turn</p>
            <p className="mt-1 text-sm font-medium">
              {status.patientsAhead} patient{status.patientsAhead > 1 ? "s" : ""} ahead — please be ready
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--mc-muted)]">Now serving</span>
            <span className="status-pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className={cn("mc-token mt-2 text-center text-4xl font-black text-[var(--navy)]", tokenFlash && "token-flash rounded-lg")}>
            {status.currentlyServing.tokenCode ?? "—"}
          </p>
          {status.currentlyServing.startedAt ? (
            <p className="mt-2 text-center text-xs text-[var(--mc-muted)]">
              {status.currentlyServing.tokenCode} · In consultation for {elapsed} min
            </p>
          ) : (
            <p className="mt-2 text-center text-xs text-[var(--mc-muted)]">When this changes, you&apos;re next</p>
          )}
        </div>

        <div
          className="relative overflow-hidden rounded-2xl p-6 text-center text-white shadow-xl"
          style={{ background: "var(--grad-blue)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Your token</p>
          <p className="mc-token relative mt-2 text-5xl font-black tracking-tight sm:text-6xl">{status.tokenCode}</p>
          <div className="relative mx-auto my-4 h-px max-w-[200px] bg-white/20" />
          <div className="relative grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-black">#{status.patientsAhead}</p>
              <p className="text-xs text-white/60">in line</p>
            </div>
            <div>
              <p className="text-3xl font-black">{formatWaitTime(status.estimatedWaitMinutes)}</p>
              <p className="text-xs text-white/60">est. wait</p>
            </div>
          </div>
          <p className="relative mt-3 text-center text-sm text-white/70">
            Expected at {formatExpectedTime(status.estimatedAppointmentTime)}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-5 shadow-sm">
          <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--mc-muted)]">
            <span>Queue progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.45)] transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-[var(--mc-muted)]">{status.patientsAhead} patients ahead of you</p>
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[var(--mc-text)]">⏱ Wait time estimate</p>
          <div className="mt-3 space-y-2 border-t border-[var(--mc-border)] pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--mc-muted)]">Current patient remaining</span>
              <span className="font-semibold">~{status.timeRemainingForCurrent} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--mc-muted)]">Patients ahead × {slotM} min</span>
              <span className="font-semibold">~{waitingAhead * slotM} min</span>
            </div>
            <div className="border-t border-dashed border-[var(--mc-border)] pt-2" />
            <div className="flex justify-between font-bold">
              <span>Your estimated wait</span>
              <span className="text-[var(--mc-blue)]">{formatWaitTime(status.estimatedWaitMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--mc-muted)]">Expected at</span>
              <span className="font-semibold">{formatExpectedTime(status.estimatedAppointmentTime)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[var(--mc-muted)]">Doctor</p>
              <p className="font-semibold text-[var(--mc-text)]">{status.doctorName}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--mc-muted)]">Department</p>
              <p className="font-semibold text-[var(--mc-text)]">{status.department}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--mc-muted)]">Room</p>
              <p className="font-semibold text-[var(--mc-text)]">{status.roomNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--mc-muted)]">Priority</p>
              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">NORMAL</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--mc-border)] bg-white p-4 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--mc-muted)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 status-pulse-dot" />
            Auto-updating · Next in {secondsUntilRefresh}s
          </div>
          <p className="mt-1 text-[11px] text-[var(--mc-muted)]">Last updated {lastUpdated.toLocaleTimeString()}</p>
          <Button variant="ghost" className="mt-2 h-9 rounded-xl text-[var(--mc-blue)]" onClick={() => void fetchStatus()}>
            Refresh now
          </Button>
        </div>
      </div>
    </div>
  )
}
