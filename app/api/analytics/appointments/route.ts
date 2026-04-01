import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { endOfDay, parseAnalyticsRange, startOfDay } from "@/lib/analytics-range"

function eachDay(from: Date, to: Date): string[] {
  const days: string[] = []
  const cur = startOfDay(new Date(from))
  const end = endOfDay(new Date(to))
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = parseAnalyticsRange(searchParams)

  const appts = await prisma.appointment.findMany({
    where: { startsAt: { gte: range.from, lte: range.to } },
    select: { startsAt: true, status: true },
  })

  const dayKeys = eachDay(range.from, range.to)
  const dailyMap = new Map<string, { booked: number; completed: number }>()
  for (const k of dayKeys) dailyMap.set(k, { booked: 0, completed: 0 })

  for (const a of appts) {
    const k = a.startsAt.toISOString().slice(0, 10)
    if (!dailyMap.has(k)) continue
    const row = dailyMap.get(k)!
    if (a.status !== "CANCELLED") row.booked += 1
    if (a.status === "COMPLETED") row.completed += 1
  }

  const daily = dayKeys.map((date) => ({
    date,
    booked: dailyMap.get(date)!.booked,
    completed: dailyMap.get(date)!.completed,
  }))

  let pending = 0
  let completed = 0
  let cancelled = 0
  let noShow = 0
  for (const a of appts) {
    if (a.status === "COMPLETED") completed += 1
    else if (a.status === "CANCELLED") cancelled += 1
    else if (a.status === "NO_SHOW") noShow += 1
    else pending += 1
  }
  const total = appts.length || 1
  const statusPie = [
    { name: "Completed", value: completed, pct: Math.round((completed / total) * 1000) / 10 },
    { name: "Cancelled", value: cancelled, pct: Math.round((cancelled / total) * 1000) / 10 },
    { name: "No-Show", value: noShow, pct: Math.round((noShow / total) * 1000) / 10 },
    { name: "Pending", value: pending, pct: Math.round((pending / total) * 1000) / 10 },
  ]

  return NextResponse.json({ daily, statusPie, range: { from: range.from.toISOString(), to: range.to.toISOString() } })
}
