"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { formatCurrency } from "@/lib/utils"
import type { AdminDoctorRow } from "@/lib/admin-doctors-list"

export function AdminDoctorsListClient({ initialRows }: { initialRows: AdminDoctorRow[] }) {
  const [rows, setRows] = useState<AdminDoctorRow[]>(initialRows)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/doctors")
      const j = await res.json()
      setRows(j.doctors ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Doctors</h1>
        <p className="text-sm text-slate-600">Performance summary — open a doctor for details.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : null}

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3 sticky left-0 z-10 bg-slate-50">Name</th>
              <th className="p-3">Dept</th>
              <th className="p-3">Specialization</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Appts</th>
              <th className="p-3">Completion %</th>
              <th className="p-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t hover:bg-slate-50">
                <td className="p-3 sticky left-0 z-10 bg-white font-medium">
                  <Link href={`/admin/doctors/${d.id}`} className="text-sky-700 hover:underline">
                    {d.name}
                  </Link>
                </td>
                <td className="p-3">{d.departmentName}</td>
                <td className="p-3">{d.specialization}</td>
                <td className="p-3">{d.rating.toFixed(1)}</td>
                <td className="p-3">{d.appointmentCount}</td>
                <td className="p-3">{d.completionRate}%</td>
                <td className="p-3">{formatCurrency(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="text-sm text-sky-700 underline"
        onClick={() => void load()}
        disabled={loading}
      >
        Refresh data
      </button>
    </div>
  )
}
