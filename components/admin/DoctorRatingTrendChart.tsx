"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function DoctorRatingTrendChart({ data }: { data: { date: string; rating: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 5]} />
        <Tooltip />
        <Line type="monotone" dataKey="rating" stroke="#0ea5e9" dot />
      </LineChart>
    </ResponsiveContainer>
  )
}
