"use client"

import React from "react"
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCard } from "@/components/admin/ChartCard"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

const PIE_COLORS = ["#0ea5e9", "#64748b", "#f97316", "#eab308"]

function heatClass(v: number, max: number) {
  if (max === 0) return "bg-slate-100"
  const t = v / max
  if (t < 0.15) return "bg-slate-100"
  if (t < 0.3) return "bg-sky-200"
  if (t < 0.45) return "bg-sky-400"
  if (t < 0.6) return "bg-sky-500"
  if (t < 0.75) return "bg-sky-600"
  return "bg-sky-800 text-white"
}

export type AdminDashboardChartsProps = {
  loading: boolean
  daily: { date: string; booked: number; completed: number }[]
  statusPie: { name: string; value: number; pct: number }[]
  weeklyVol: { name: string; patients: number }[]
  noShow: { name: string; rate: number }[]
  heatmap: {
    hours: number[]
    days: string[]
    grid: number[][]
    max: number
  } | null
  revenueMonthly: { month: string; revenue: number }[]
}

export function AdminDashboardCharts({
  loading,
  daily,
  statusPie,
  weeklyVol,
  noShow,
  heatmap,
  revenueMonthly,
}: AdminDashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Daily appointments (booked vs completed)" loading={loading} fileName="daily-appointments">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="booked" stroke="#0ea5e9" name="Booked" dot={false} />
            <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Appointment status" loading={loading} fileName="status-pie">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {statusPie.map((_, i) => (
                <Cell key={`c-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Department volume (this week)" loading={loading} fileName="dept-weekly">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeklyVol}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="patients" fill="#0ea5e9" name="Patients" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="No-show rate by department" loading={loading} fileName="no-show">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={noShow} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="rate" fill="#f97316" name="%" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue trend (12 months)" loading={loading} fileName="revenue">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenueMonthly}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
            <Area type="monotone" dataKey="revenue" stroke="#0284c7" fillOpacity={1} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Peak hours heatmap" loading={loading} fileName="heatmap">
        {heatmap ? (
          <div className="overflow-x-auto max-w-full">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${heatmap.hours.length}, minmax(0,1fr))` }}>
              <div />
              {heatmap.hours.map((h) => (
                <div key={h} className="text-center text-[10px] text-slate-500">
                  {h}h
                </div>
              ))}
              {heatmap.days.map((day, di) => (
                <React.Fragment key={day}>
                  <div className="text-xs text-slate-600 pr-2 py-1">{day}</div>
                  {heatmap.hours.map((_, hi) => (
                    <div
                      key={`${di}-${hi}`}
                      title={`${day} ${heatmap.hours[hi]}:00 — ${heatmap.grid[di][hi]}`}
                      className={cn("rounded-sm p-2 text-center text-[10px]", heatClass(heatmap.grid[di][hi], heatmap.max))}
                    >
                      {heatmap.grid[di][hi] || ""}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : null}
      </ChartCard>
    </div>
  )
}
