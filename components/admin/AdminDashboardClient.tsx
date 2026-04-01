"use client"

import React from "react"
import dynamic from "next/dynamic"
import { Link } from "@/i18n/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { useRouter } from "@/i18n/navigation"

import { AdminDateRange, buildRangeQuery, type Preset } from "@/components/admin/AdminDateRange"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { toastError } from "@/lib/toast-api"

const AdminDashboardCharts = dynamic(
  () => import("@/components/admin/AdminDashboardCharts").then((m) => m.AdminDashboardCharts),
  { ssr: false, loading: () => <div className="text-sm text-slate-500 py-8">Loading charts…</div> }
)

export function AdminDashboardClient() {
  const router = useRouter()
  const [preset, setPreset] = useState<Preset>("30")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<{
    appointmentsToday: number
    appointmentsYesterday: number
    appointmentsChangePct: number
    revenueToday: number
    bedsOccupied: number
    bedsTotal: number
    avgQueueWaitMinutes: number
  } | null>(null)

  const [daily, setDaily] = useState<{ date: string; booked: number; completed: number }[]>([])
  const [statusPie, setStatusPie] = useState<{ name: string; value: number; pct: number }[]>([])
  const [weeklyVol, setWeeklyVol] = useState<{ name: string; patients: number }[]>([])
  const [noShow, setNoShow] = useState<{ name: string; rate: number }[]>([])
  const [heatmap, setHeatmap] = useState<{
    hours: number[]
    days: string[]
    grid: number[][]
    max: number
  } | null>(null)
  const [revenueMonthly, setRevenueMonthly] = useState<{ month: string; revenue: number }[]>([])
  const [topDoctors, setTopDoctors] = useState<
    {
      id: string
      name: string
      departmentName: string
      patientsThisMonth: number
      rating: number
      avgConsultMinutes: number
      revenue: number
    }[]
  >([])

  const [sortKey, setSortKey] = useState<"name" | "patientsThisMonth" | "rating" | "avgConsultMinutes" | "revenue">(
    "revenue"
  )
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const q = useMemo(() => buildRangeQuery(preset, from, to), [preset, from, to])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [o, a, d, h, r, td] = await Promise.all([
        fetch(`/api/analytics/overview?${q}`),
        fetch(`/api/analytics/appointments?${q}`),
        fetch(`/api/analytics/departments?${q}`),
        fetch(`/api/analytics/heatmap?${q}`),
        fetch(`/api/analytics/revenue`),
        fetch(`/api/analytics/top-doctors`),
      ])
      if (!o.ok || !a.ok || !d.ok || !h.ok || !r.ok || !td.ok) {
        toastError("Could not load dashboard analytics")
        return
      }
      const oj = await o.json()
      const aj = await a.json()
      const dj = await d.json()
      const hj = await h.json()
      const rj = await r.json()
      const tdj = await td.json()

      setKpis(oj.kpis)
      setDaily(aj.daily ?? [])
      setStatusPie(aj.statusPie ?? [])
      setWeeklyVol((dj.weeklyVolume ?? []).map((x: { name: string; patients: number }) => ({ name: x.name, patients: x.patients })))
      setNoShow((dj.noShowRate ?? []).map((x: { name: string; rate: number }) => ({ name: x.name, rate: x.rate })))
      setHeatmap(hj)
      setRevenueMonthly(rj.monthly ?? [])
      setTopDoctors(tdj.doctors ?? [])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    void load()
  }, [load])

  const sortedDoctors = useMemo(() => {
    const arr = [...topDoctors]
    arr.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const n = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === "asc" ? n : -n
    })
    return arr
  }, [topDoctors, sortKey, sortDir])

  function toggleSort(k: typeof sortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(k)
      setSortDir("desc")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics hub</h1>
        <p className="text-sm text-slate-600">KPIs, trends, and operational charts.</p>
      </div>

      <AdminDateRange
        preset={preset}
        onPreset={setPreset}
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Today's appointments"
          value={kpis?.appointmentsToday ?? "—"}
          sub={
            kpis ? (
              <span className={cn("flex items-center gap-1", kpis.appointmentsChangePct >= 0 ? "text-emerald-600" : "text-red-600")}>
                {kpis.appointmentsChangePct >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {Math.abs(kpis.appointmentsChangePct)}% vs yesterday
              </span>
            ) : null
          }
          loading={loading && !kpis}
        />
        <KpiCard
          title="Revenue today"
          value={kpis ? formatCurrency(kpis.revenueToday) : "—"}
          loading={loading && !kpis}
        />
        <KpiCard
          title="Beds occupied"
          value={kpis ? `${kpis.bedsOccupied} / ${kpis.bedsTotal}` : "—"}
          loading={loading && !kpis}
        />
        <KpiCard
          title="Avg queue wait"
          value={kpis ? `${kpis.avgQueueWaitMinutes} min` : "—"}
          loading={loading && !kpis}
        />
      </div>

      <AdminDashboardCharts
        loading={loading}
        daily={daily}
        statusPie={statusPie}
        weeklyVol={weeklyVol}
        noShow={noShow}
        heatmap={heatmap}
        revenueMonthly={revenueMonthly}
      />

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-slate-900">Top doctors</h2>
          <Link href="/admin/doctors" className="text-sm text-sky-700 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">
                  <button type="button" className="font-medium hover:text-sky-700" onClick={() => toggleSort("name")}>
                    Doctor
                  </button>
                </th>
                <th className="p-3">Dept</th>
                <th className="p-3">
                  <button type="button" className="font-medium hover:text-sky-700" onClick={() => toggleSort("patientsThisMonth")}>
                    Patients (mo)
                  </button>
                </th>
                <th className="p-3">
                  <button type="button" className="font-medium hover:text-sky-700" onClick={() => toggleSort("rating")}>
                    Rating
                  </button>
                </th>
                <th className="p-3">
                  <button type="button" className="font-medium hover:text-sky-700" onClick={() => toggleSort("avgConsultMinutes")}>
                    Avg consult
                  </button>
                </th>
                <th className="p-3">
                  <button type="button" className="font-medium hover:text-sky-700" onClick={() => toggleSort("revenue")}>
                    Revenue
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDoctors.slice(0, 8).map((d) => (
                <tr key={d.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/admin/doctors/${d.id}`)}>
                  <td className="p-3 font-medium text-sky-800">{d.name}</td>
                  <td className="p-3 text-slate-600">{d.departmentName}</td>
                  <td className="p-3">{d.patientsThisMonth}</td>
                  <td className="p-3">{d.rating.toFixed(1)}</td>
                  <td className="p-3">{d.avgConsultMinutes} min</td>
                  <td className="p-3">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  sub,
  loading,
}: {
  title: string
  value: string | number
  sub?: React.ReactNode
  loading?: boolean
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{loading ? "…" : value}</div>
      {sub ? <div className="mt-3 text-xs text-slate-600">{sub}</div> : null}
    </div>
  )
}
