"use client"

import type { ReactNode, ReactElement } from "react"
import { Fragment } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { cn, formatCurrency } from "@/lib/utils"
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter"
import { toastError } from "@/lib/toast-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = ["#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#22c55e"]

type AnalyticsPayload = {
  period: number
  kpis: {
    totalPatients: number
    patientsToday: number
    activeQueue: number
    avgWaitToday: number
    revenueToday: number
    bedsOccupied: number
    bedsTotal: number
    noShowRate: number
    topDisease: string
  }
  diseases: {
    topDiseases: { diagnosis: string; count: number }[]
    diseaseTrend: { month: string; diseases: Record<string, number> }[]
    diseaseByDept: { department: string; diseases: Record<string, number> }[]
  }
  demographics: {
    ageGroups: { group: string; count: number }[]
    gender: { gender: string; count: number }[]
    bloodGroups: { bloodGroup: string; count: number }[]
    newPatientsPerMonth: { month: string; count: number }[]
  }
  queue: {
    avgWaitByDept: { department: string; avgMinutes: number }[]
    peakHours: { day: string; hour: number; count: number }[]
    noShowByDept: { department: string; rate: number }[]
    queueByHour: { hour: number; avgLength: number }[]
  }
  financial: {
    dailyRevenue: { date: string; amount: number }[]
    revenueByDept: { department: string; amount: number }[]
    topDoctors: { name: string; amount: number }[]
  }
  doctorPerformance: Array<{
    doctorId: string
    name: string
    department: string
    patientsThisMonth: number
    avgConsultMinutes: number
    rating: number
    completionRate: number
    noShowRate: number
    revenue: number
  }>
}

const HEAT_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const
const HEAT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

function peakCellClass(n: number, max: number) {
  if (max <= 0 || n === 0) return "bg-slate-50 text-slate-400"
  const r = n / max
  if (r < 0.12) return "bg-blue-100 text-blue-950"
  if (r < 0.24) return "bg-blue-200 text-blue-950"
  if (r < 0.36) return "bg-blue-300 text-blue-950"
  if (r < 0.48) return "bg-blue-400 text-white"
  if (r < 0.6) return "bg-blue-500 text-white"
  if (r < 0.72) return "bg-blue-600 text-white"
  if (r < 0.84) return "bg-blue-700 text-white"
  if (r < 0.93) return "bg-blue-800 text-white"
  return "bg-blue-900 text-white"
}

function PeakHeatmap({ peakHours }: { peakHours: { day: string; hour: number; count: number }[] }) {
  const map = new Map<string, number>()
  for (const p of peakHours) {
    map.set(`${p.day}-${p.hour}`, p.count)
  }
  const max = Math.max(0, ...peakHours.map((p) => p.count))

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid min-w-[640px] gap-1"
        style={{ gridTemplateColumns: `72px repeat(${HEAT_HOURS.length}, minmax(0, 1fr))` }}
      >
        <div />
        {HEAT_HOURS.map((h) => {
          const label = h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`
          return (
            <div key={h} className="text-center text-[10px] font-semibold text-slate-500">
              {label}
            </div>
          )
        })}
        {HEAT_DAYS.map((day) => (
          <Fragment key={day}>
            <div className="flex items-center text-xs font-semibold text-slate-600">{day.slice(0, 3)}</div>
            {HEAT_HOURS.map((hour) => {
              const c = map.get(`${day}-${hour}`) ?? 0
              return (
                <div
                  key={`${day}-${hour}`}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md text-[11px] font-semibold transition-colors",
                    peakCellClass(c, max)
                  )}
                >
                  {c}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Low <span className="mx-1 inline-flex gap-0.5"><span className="h-3 w-3 rounded-sm bg-blue-100" /><span className="h-3 w-3 rounded-sm bg-blue-400" /><span className="h-3 w-3 rounded-sm bg-blue-900" /></span> High
      </p>
    </div>
  )
}

function KpiAnimated({ title, target, format }: { title: string; target: number; format?: (n: number) => string }) {
  const v = useAnimatedCounter(target, 1200, true)
  return <Kpi title={title} value={format ? format(v) : Math.round(v)} />
}

export function AdminAnalyticsClient() {
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [docSort, setDocSort] = useState<{ key: "name" | "patients" | "rating" | "completion" | "noShow" | "revenue"; dir: "asc" | "desc" }>({
    key: "revenue",
    dir: "desc",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/analytics?period=${period}`, { cache: "no-store" })
      if (!r.ok) {
        toastError("Failed to load analytics")
        return
      }
      setData(await r.json())
    } catch {
      toastError("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void load()
  }, [load])

  const trendLines = useMemo(() => {
    if (!data?.diseases.diseaseTrend.length) return []
    const allNames = new Set<string>()
    for (const t of data.diseases.diseaseTrend) {
      Object.keys(t.diseases).forEach((k) => allNames.add(k))
    }
    const top = Array.from(allNames).slice(0, 5)
    return data.diseases.diseaseTrend.map((row) => {
      const o: Record<string, string | number> = { month: row.month }
      for (const n of top) o[n] = row.diseases[n] ?? 0
      return o
    })
  }, [data])

  const sortedDoctors = useMemo(() => {
    if (!data) return []
    const rows = [...data.doctorPerformance]
    const { key, dir } = docSort
    const m = dir === "asc" ? 1 : -1
    rows.sort((a, b) => {
      let cmp = 0
      if (key === "name") cmp = a.name.localeCompare(b.name)
      else if (key === "patients") cmp = a.patientsThisMonth - b.patientsThisMonth
      else if (key === "rating") cmp = a.rating - b.rating
      else if (key === "completion") cmp = a.completionRate - b.completionRate
      else if (key === "noShow") cmp = a.noShowRate - b.noShowRate
      else cmp = a.revenue - b.revenue
      return cmp * m
    })
    return rows
  }, [data, docSort])

  if (loading && !data) {
    return <div className="p-8 text-slate-500">Loading analytics…</div>
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-red-600">No data</p>
        <Button className="mt-2" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    )
  }

  const k = data.kpis

  function toggleDocSort(key: typeof docSort.key) {
    setDocSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }))
  }

  return (
    <div className="space-y-8">
      <div
        className="flex flex-col gap-4 rounded-2xl px-6 py-8 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "var(--grad-navy)" }}
      >
        <div>
          <h1 className="mc-display text-2xl font-bold md:text-3xl">Analytics &amp; Intelligence</h1>
          <p className="mt-1 text-sm text-teal-200/90">MediCore HMS · Real-time operational data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90, 365].map((p) => (
            <Button
              key={p}
              size="sm"
              className={cn(
                "rounded-full border-0",
                period === p ? "bg-white text-[var(--navy)] hover:bg-white" : "bg-white/10 text-white hover:bg-white/20"
              )}
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
            >
              {p === 365 ? "Year" : `${p}d`}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10">
            Export
          </Button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <KpiAnimated title="Total patients" target={k.totalPatients} />
        <KpiAnimated title="Patients today" target={k.patientsToday} />
        <KpiAnimated title="Active queue" target={k.activeQueue} />
        <KpiAnimated title="Avg wait today (min)" target={k.avgWaitToday} />
        <KpiAnimated title="Revenue today" target={k.revenueToday} format={(n) => formatCurrency(Math.round(n))} />
        <Kpi title="Beds occupied" value={`${k.bedsOccupied}/${k.bedsTotal ?? 0}`} />
        <KpiAnimated title="No-show rate (month) %" target={k.noShowRate} />
        <Kpi title="Top disease" value={k.topDisease} small />
      </div>

      <Section title="Top diagnoses" subtitle="Most frequent diagnoses (all records with diagnosis)">
        <ChartWrap height={320}>
          <BarChart data={data.diseases.topDiseases.slice(0, 12)} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="diagnosis" width={110} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#0284c7" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartWrap>
        <Insight text={`Leading diagnosis: ${data.diseases.topDiseases[0]?.diagnosis ?? "—"} (${data.diseases.topDiseases[0]?.count ?? 0} records).`} />
      </Section>

      <Section title="Disease trend (6 months)" subtitle="Counts per month for diseases appearing in records">
        {trendLines.length > 0 && trendLines[0] ? (
          <ChartWrap height={300}>
            <LineChart data={trendLines}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(trendLines[0])
                .filter((k) => k !== "month")
                .slice(0, 5)
                .map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} dot={false} />
                ))}
            </LineChart>
          </ChartWrap>
        ) : (
          <p className="text-sm text-slate-500">Not enough diagnosis history for a trend yet.</p>
        )}
      </Section>

      <Section title="Patient demographics" subtitle="Age groups from date of birth">
        <ChartWrap height={280}>
          <BarChart data={data.demographics.ageGroups}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="group" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#38bdf8" />
          </BarChart>
        </ChartWrap>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Gender" subtitle="Registered patients">
          <ChartWrap height={260}>
            <PieChart>
              <Pie data={data.demographics.gender} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={90} label>
                {data.demographics.gender.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartWrap>
        </Section>
        <Section title="Blood groups">
          <ChartWrap height={260}>
            <BarChart data={data.demographics.bloodGroups}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bloodGroup" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ChartWrap>
        </Section>
      </div>

      <Section title="New patients per month" subtitle="Last 12 months by registration date">
        <ChartWrap height={260}>
          <BarChart data={data.demographics.newPatientsPerMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#0d9488" />
          </BarChart>
        </ChartWrap>
      </Section>

      <Section title="Average wait by department" subtitle="Hospital target: 30 minutes (reference line)">
        <ChartWrap height={280}>
          <BarChart data={data.queue.avgWaitByDept}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <ReferenceLine y={30} stroke="#94a3b8" strokeDasharray="5 5" label="30m" />
            <Bar dataKey="avgMinutes" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800}>
              {data.queue.avgWaitByDept.map((e, i) => (
                <Cell key={i} fill={e.avgMinutes > 30 ? "#f97316" : "#0d9488"} />
              ))}
            </Bar>
          </BarChart>
        </ChartWrap>
        <Insight text="Target wait under 30 minutes where possible." />
      </Section>

      <Section title="No-show rate by department" subtitle={`Period: ${period} days`}>
        <ChartWrap height={280}>
          <BarChart data={data.queue.noShowByDept}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="rate" fill="#ef4444" />
          </BarChart>
        </ChartWrap>
      </Section>

      <Section title="Peak hours heatmap" subtitle="Appointment volume by weekday and hour (period)">
        <PeakHeatmap peakHours={data.queue.peakHours} />
      </Section>

      <Section title="Queue volume by hour" subtitle="Average appointments per hour bucket">
        <ChartWrap height={260}>
          <BarChart data={data.queue.queueByHour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avgLength" fill="#3b82f6" isAnimationActive animationDuration={800} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartWrap>
      </Section>

      <Section title="Daily revenue" subtitle="Paid amounts in selected period">
        <ChartWrap height={280}>
          <AreaChart data={data.financial.dailyRevenue}>
            <defs>
              <linearGradient id="mcRevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} />
            <YAxis />
            <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#1d4ed8"
              strokeWidth={2}
              fill="url(#mcRevFill)"
              isAnimationActive
              animationDuration={800}
            />
          </AreaChart>
        </ChartWrap>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Revenue by department">
          <ChartWrap height={280}>
            <PieChart>
              <Pie
                data={data.financial.revenueByDept}
                dataKey="amount"
                nameKey="department"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                isAnimationActive
                animationDuration={800}
              >
                {data.financial.revenueByDept.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              <Legend />
            </PieChart>
          </ChartWrap>
        </Section>
        <Section title="Top earning doctors (period)">
          <ChartWrap height={280}>
            <BarChart data={data.financial.topDoctors} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `₹${v}`} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              <Bar dataKey="amount" fill="#ea580c" isAnimationActive animationDuration={800} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartWrap>
        </Section>
      </div>

      <Card className="rounded-2xl border-[var(--mc-border)] shadow-sm">
        <CardHeader className="border-b border-[var(--mc-border)] bg-[var(--mc-bg)]/40">
          <CardTitle>Doctor performance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="cursor-pointer p-3 hover:text-slate-800" onClick={() => toggleDocSort("name")}>
                  Doctor {docSort.key === "name" ? (docSort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="p-3">Dept</th>
                <th className="cursor-pointer p-3 hover:text-slate-800" onClick={() => toggleDocSort("patients")}>
                  Patients {docSort.key === "patients" ? (docSort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="cursor-pointer p-3 hover:text-slate-800" onClick={() => toggleDocSort("rating")}>
                  Rating {docSort.key === "rating" ? (docSort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="cursor-pointer p-3 hover:text-slate-800" onClick={() => toggleDocSort("completion")}>
                  Completion {docSort.key === "completion" ? (docSort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="cursor-pointer p-3 hover:text-slate-800" onClick={() => toggleDocSort("noShow")}>
                  No-show {docSort.key === "noShow" ? (docSort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="cursor-pointer p-3 text-right hover:text-slate-800" onClick={() => toggleDocSort("revenue")}>
                  Revenue {docSort.key === "revenue" ? (docSort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDoctors.map((d) => (
                <tr key={d.doctorId} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-xs font-bold text-white">
                        {d.name[0]}
                      </span>
                      <span className="font-medium text-slate-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{d.department}</span>
                  </td>
                  <td className="p-3 tabular-nums">{d.patientsThisMonth}</td>
                  <td className="p-3">
                    <span className="text-amber-500">{"★".repeat(Math.min(5, Math.round(d.rating)))}</span>
                    <span className="text-slate-300">{"★".repeat(Math.max(0, 5 - Math.round(d.rating)))}</span>
                    <span className="ml-1 text-xs text-slate-500">{d.rating.toFixed(1)}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, d.completionRate)}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">{d.completionRate}%</span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "p-3 font-medium tabular-nums",
                      d.noShowRate < 10 ? "text-emerald-600" : d.noShowRate < 20 ? "text-amber-600" : "text-red-600"
                    )}
                  >
                    {d.noShowRate}%
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ title, value, small }: { title: string; value: string | number; small?: boolean }) {
  return (
    <Card className="min-w-[168px] shrink-0 rounded-2xl border-[var(--mc-border)] shadow-sm">
      <CardContent className="pt-4">
        <div className={cn("font-bold text-slate-900", small ? "text-sm" : "text-2xl")}>{value}</div>
        <div className="text-xs font-medium text-slate-500">{title}</div>
      </CardContent>
    </Card>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ChartWrap({ height, children }: { height: number; children: ReactElement }) {
  return (
    <div style={{ width: "100%", height }} className="min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function Insight({ text }: { text: string }) {
  return <p className="mt-2 text-sm text-slate-600">{text}</p>
}
