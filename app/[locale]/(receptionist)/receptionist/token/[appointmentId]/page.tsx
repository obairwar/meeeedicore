"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { Loader2 } from "lucide-react"

import { TokenCard, printTokenCard } from "@/components/receptionist/TokenCard"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Appt = {
  id: string
  tokenCode: string
  status: string
  priority: string
  startsAt: string
  patientName: string
  doctorName: string
  departmentName: string
  room: string
  queuePosition: number
  estimatedWaitMinutes: number
}

function priorityLabel(p: string) {
  if (p === "EMERGENCY") return "EMERGENCY"
  if (p === "CRITICAL" || p === "HIGH") return "URGENT"
  return "NORMAL"
}

export default function ReceptionistTokenPrintPage() {
  const params = useParams<{ appointmentId?: string | string[] }>()
  const appointmentId =
    typeof params.appointmentId === "string"
      ? params.appointmentId
      : Array.isArray(params.appointmentId)
        ? params.appointmentId[0]
        : ""

  const [data, setData] = useState<Appt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!appointmentId) return
    const r = await fetch(`/api/receptionist/appointments/${appointmentId}`, { cache: "no-store" })
    const j = await r.json()
    if (!r.ok) {
      setError(typeof j.error === "string" ? j.error : "Failed")
      setData(null)
    } else {
      setData(j.appointment as Appt)
      setError(null)
    }
    setLoading(false)
  }, [appointmentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!data) return
    const t = setTimeout(() => {
      window.print()
    }, 400)
    return () => clearTimeout(t)
  }, [data])

  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading token…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error ?? "Not found"}</p>
        <Link href="/receptionist/dashboard" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
          Back
        </Link>
      </div>
    )
  }

  const start = new Date(data.startsAt)

  return (
    <div className="min-h-screen bg-[var(--mc-bg)] p-4 pb-16 print:bg-white print:p-0">
      <div className="no-print mx-auto max-w-lg space-y-6 text-center">
        <p className="text-2xl font-bold text-emerald-600">Token generated! ✅</p>
        <p className="text-sm text-[var(--mc-muted)]">Review the slip below, then print for the patient.</p>
      </div>

      <div className="no-print mx-auto mt-6 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="mc-btn-primary h-12 flex-1 rounded-xl text-base font-semibold text-white shadow-lg"
          style={{ background: "var(--grad-blue)" }}
          onClick={() => printTokenCard()}
        >
          🖨️ Print token card
        </Button>
        <Link
          href="/receptionist/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "h-12 flex-1 rounded-xl border-[var(--mc-border)]")}
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="print-token-only mx-auto mt-10 max-w-[400px] print:mt-0">
        <TokenCard
          tokenCode={data.tokenCode}
          patientName={data.patientName}
          doctorName={data.doctorName}
          departmentName={data.departmentName}
          room={data.room}
          dateLabel={start.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
          timeLabel={start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          priorityLabel={priorityLabel(data.priority)}
          estimatedWaitMinutes={data.estimatedWaitMinutes}
          queuePosition={data.queuePosition}
          appointmentId={data.id}
          appBaseUrl={base}
        />
      </div>
    </div>
  )
}
