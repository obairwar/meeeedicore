"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, Flag } from "lucide-react"
import { DoctorRatingChartDynamic } from "@/components/admin/DoctorRatingChartDynamic"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toastError } from "@/lib/toast-api"

export default function AdminDoctorPerformancePage() {
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    doctor: { name: string; department: { name: string }; rating: number }
    stats: { revenue: number; avgConsultMinutes: number; completionRate: number; appointmentCount: number }
    ratingTrend: { date: string; rating: number }[]
    calendar: { id: string; startsAt: string; status: string; tokenCode: string }[]
    feedback: { id: string; rating: number; comment: string | null; patientName: string; lowRating: boolean }[]
  } | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/doctors/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setData)
      .catch(() => {
        setData(null)
        toastError("Could not load doctor analytics")
      })
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  if (!data) {
    return <p className="text-red-600">Doctor not found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.doctor.name}</h1>
          <p className="text-sm text-slate-600">{data.doctor.department.name} · ⭐ {data.doctor.rating.toFixed(1)}</p>
        </div>
        <Link href="/admin/doctors" className="text-sm text-sky-700 underline">
          Back to list
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue (sample)" value={formatCurrency(data.stats.revenue)} />
        <Stat label="Avg consult time" value={`${data.stats.avgConsultMinutes} min`} />
        <Stat label="Completion rate" value={`${data.stats.completionRate}%`} />
        <Stat label="Appointments" value={String(data.stats.appointmentCount)} />
      </div>

      <div className="rounded-lg border bg-white p-4 overflow-x-auto">
        <h2 className="font-semibold mb-2">Rating trend</h2>
        <DoctorRatingChartDynamic data={data.ratingTrend} />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="border-b px-4 py-2 font-semibold">Recent appointments</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Token</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.calendar.slice(0, 15).map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{new Date(a.startsAt).toLocaleString()}</td>
                <td className="p-2">{a.tokenCode}</td>
                <td className="p-2">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Feedback</h2>
        <ul className="space-y-2">
          {data.feedback.map((f) => (
            <li key={f.id} className="border rounded-md p-3 text-sm flex flex-wrap justify-between gap-2">
              <div>
                <span className="font-medium">{f.patientName}</span> — {f.rating}★
                {f.comment ? <p className="text-slate-600 mt-1">{f.comment}</p> : null}
              </div>
              {f.lowRating ? (
                <Badge className="bg-amber-500 gap-1">
                  <Flag className="h-3 w-3" /> Low rating
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  )
}
