"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCard } from "@/components/admin/ChartCard"

const COLORS = ["#0ea5e9", "#a855f7", "#22c55e", "#f97316", "#64748b"]

export type AdminAnalyticsChartsProps = {
  loading: boolean
  ageGroups: { name: string; value: number }[]
  genderPie: { name: string; value: number }[]
}

export function AdminAnalyticsCharts({ loading, ageGroups, genderPie }: AdminAnalyticsChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Patient age groups" loading={loading} fileName="age-groups">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ageGroups}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#0ea5e9" name="Patients" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Gender distribution" loading={loading} fileName="gender">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={genderPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {(genderPie ?? []).map((_, i) => (
                <Cell key={`g-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
