"use client"

import { useEffect, useState } from "react"
import { Link } from "@/i18n/navigation"
import { Loader2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Appt = {
  id: string
  startsAt: string
  tokenCode: string
  status: string
  doctorName: string
  departmentName: string
}

export default function PatientQueueHubPage() {
  const [items, setItems] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/patient/appointments", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const d = j.success && j.data ? j.data : j
        const list = (d.appointments ?? []) as Appt[]
        setItems(list.filter((a) => a.status === "CONFIRMED" || a.status === "IN_PROGRESS"))
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your visits…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My queue</h1>
        <p className="text-sm text-slate-600">Pick an appointment to see live position and wait time.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-600">No active visits in the queue right now.</p>
          <Link
            href="/book"
            className={cn(
              buttonVariants(),
              "mt-4 w-full bg-sky-600 text-white hover:bg-sky-700 border-transparent"
            )}
          >
            Book an appointment
          </Link>
          <Link href="/dashboard" className="mt-3 block text-sm text-sky-700 underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-medium text-slate-900">{a.doctorName}</div>
              <div className="text-sm text-slate-600">{a.departmentName}</div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(a.startsAt).toLocaleString()} · Token {a.tokenCode}
              </div>
              <Link
                href={`/queue/${a.id}`}
                className={cn(
                  buttonVariants(),
                  "mt-3 w-full bg-sky-600 text-white hover:bg-sky-700 border-transparent"
                )}
              >
                Track my queue
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
