"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { calculateAge } from "@/lib/utils"

type MeResponse = {
  success?: boolean
  data?: { id: string; departmentId: string; slotDurationMinutes: number; name: string }
  error?: string
}

type QueueApi = {
  success?: boolean
  data?: {
    currentlyServing: {
      id: string
      tokenCode: string
      tokenNumber: number
      priority: string
      patient: {
        name: string
        phone: string | null
        dateOfBirth: Date | string | null
        bloodGroup: string | null
      }
      symptoms: string
      queueEntry?: { startedAt: Date | string | null } | null
    } | null
    queue: Array<{
      id: string
      position: number
      estimatedWaitMinutes: number
      appointment: {
        tokenCode: string
        symptoms: string
        priority?: string
        patient: { name: string; dateOfBirth: Date | string | null; bloodGroup: string | null }
      }
    }>
    queueLength: number
    slotDurationMinutes: number
    avgWaitMinutes?: number
  }
  error?: string | null
}

function tokenNumberFromCode(tokenCode: string): number {
  const parts = tokenCode.split("-")
  const last = parts[parts.length - 1]
  const n = parseInt(last ?? "0", 10)
  return Number.isFinite(n) ? n : 0
}

export default function DoctorQueuePage() {
  const { data: session, status: sessionStatus } = useSession()

  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const [queueData, setQueueData] = useState<QueueApi["data"] | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [calling, setCalling] = useState(false)
  const [consultingDuration, setConsultingDuration] = useState(0)

  const loadDoctor = useCallback(async () => {
    setMeError(null)
    setLoadingMe(true)
    try {
      const r = await fetch("/api/doctors/me", { cache: "no-store" })
      const j = (await r.json()) as MeResponse
      if (!r.ok || !j.success || !j.data) {
        setMeError(j.error ?? "Could not load doctor profile")
        setDoctorId(null)
      } else {
        setDoctorId(j.data.id)
      }
    } catch {
      setMeError("Could not load doctor profile")
      setDoctorId(null)
    } finally {
      setLoadingMe(false)
    }
  }, [])

  const loadQueue = useCallback(async (id: string) => {
    setQueueError(null)
    setLoadingQueue(true)
    try {
      const r = await fetch(`/api/queue/${id}`, { cache: "no-store" })
      const j = (await r.json()) as QueueApi
      if (!r.ok || j.success === false) {
        setQueueData(null)
        setQueueError(j.error ?? "Failed to load queue")
      } else {
        setQueueData(j.data ?? null)
      }
    } catch {
      setQueueData(null)
      setQueueError("Failed to load queue")
    } finally {
      setLoadingQueue(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") void loadDoctor()
  }, [sessionStatus, loadDoctor])

  useEffect(() => {
    if (!doctorId) return
    void loadQueue(doctorId)
    const t = setInterval(() => void loadQueue(doctorId), 12000)
    return () => clearInterval(t)
  }, [doctorId, loadQueue])

  // Count up timer for current consultation
  useEffect(() => {
    const startedAt = queueData?.currentlyServing?.queueEntry?.startedAt
    if (!startedAt) return

    const updateTimer = () => {
      const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
      setConsultingDuration(mins)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 30000)
    return () => clearInterval(interval)
  }, [queueData?.currentlyServing?.queueEntry?.startedAt])

  async function callNext() {
    if (!doctorId) return
    setCalling(true)
    try {
      await fetch(`/api/queue/${doctorId}/call-next`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomNumber: "204" }),
      })
      await loadQueue(doctorId)
    } finally {
      setCalling(false)
    }
  }

  if (sessionStatus === "loading" || loadingMe) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    )
  }

  if (sessionStatus !== "authenticated" || session?.user?.role !== "DOCTOR") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Sign in as a doctor to manage the queue.
      </div>
    )
  }

  if (meError || !doctorId) {
    return (
      <div className="space-y-2">
        <p className="text-red-600">{meError ?? "No doctor profile"}</p>
        <Button type="button" variant="outline" onClick={() => void loadDoctor()}>
          Retry
        </Button>
      </div>
    )
  }

  const current = queueData?.currentlyServing

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Today&apos;s queue</h1>
          <p className="text-slate-600">Call patients in order — updates every ~12s</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void loadQueue(doctorId)} disabled={loadingQueue}>
            {loadingQueue ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
          <Button type="button" onClick={() => void callNext()} disabled={calling}>
            {calling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Call next patient
          </Button>
        </div>
      </div>

      {queueError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{queueError}</div>
      ) : null}

      {/* CURRENTLY CONSULTING — TOP OF PAGE */}
      {current ? (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-blue-100 text-sm font-medium uppercase tracking-wider">Currently Consulting</span>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-white font-mono font-bold text-sm">{consultingDuration} min</span>
              <span className="text-blue-200 text-xs">elapsed</span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {current.patient?.name?.charAt(0) ?? "?"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-white font-bold text-xl">{current.patient?.name}</h2>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-mono">{current.tokenCode}</span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-blue-100 text-sm mb-3">
                {current.patient?.dateOfBirth ? <span>Age: {calculateAge(current.patient.dateOfBirth)}</span> : null}
                {current.patient?.bloodGroup ? <span>Blood: {current.patient.bloodGroup}</span> : null}
                <span>Token #{tokenNumberFromCode(current.tokenCode)}</span>
              </div>

              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Chief Complaint</p>
                <p className="text-white text-sm">{current.symptoms}</p>
              </div>
            </div>

            <div className="flex-shrink-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  current.priority === "EMERGENCY"
                    ? "bg-red-500 text-white"
                    : current.priority === "URGENT" || current.priority === "HIGH"
                      ? "bg-amber-400 text-amber-900"
                      : "bg-white/20 text-white"
                }`}
              >
                {current.priority}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-white/20">
            <button
              onClick={() => alert("Consultation notes UI coming soon")}
              className="flex-1 bg-white text-blue-600 rounded-xl py-2.5 font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              📋 Open Consultation Notes
            </button>
            <button
              onClick={() => void callNext()}
              disabled={calling}
              className="flex-1 bg-white/15 hover:bg-white/25 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {calling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calling...
                </>
              ) : (
                "→ Call Next Patient"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-slate-200 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-slate-700 font-semibold">No patient in consultation</p>
          <p className="text-slate-400 text-sm mt-1">
            {queueData?.queueLength ? `${queueData.queueLength} patient(s) waiting — click "Call Next" to begin` : "Queue is empty for today"}
          </p>
          {queueData?.queueLength ? (
            <button
              onClick={() => void callNext()}
              disabled={calling}
              className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {calling ? "Calling..." : "→ Call First Patient"}
            </button>
          ) : null}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Waiting ({queueData?.queueLength ?? 0})</span>
            <span className="text-sm font-normal text-slate-500">
              ~{queueData?.slotDurationMinutes ?? queueData?.avgWaitMinutes ?? 15} min / slot
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!queueData?.queue?.length ? (
            <p className="text-slate-600">No one waiting.</p>
          ) : (
            queueData.queue.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">{row.appointment.tokenCode}</span>
                      <Badge variant="outline">#{row.position}</Badge>
                    </div>
                    <p className="font-medium text-slate-900">{row.appointment.patient.name}</p>
                    <p className="text-xs text-slate-500">
                      {row.appointment.patient.dateOfBirth
                        ? `${calculateAge(row.appointment.patient.dateOfBirth)} yrs`
                        : "Age —"}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">~{row.estimatedWaitMinutes} min wait</div>
                </div>
                <p className="text-sm text-slate-700">{row.appointment.symptoms}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
