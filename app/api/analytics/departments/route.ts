import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { parseAnalyticsRange, startOfDay } from "@/lib/analytics-range"

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = parseAnalyticsRange(searchParams)

  const now = new Date()
  const dow = now.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const weekStart = startOfDay(new Date(now))
  weekStart.setDate(weekStart.getDate() + mondayOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const weekAppts = await prisma.appointment.findMany({
    where: { startsAt: { gte: weekStart, lt: weekEnd } },
    select: { departmentId: true, department: { select: { name: true, code: true } } },
  })

  const volMap = new Map<string, { name: string; code: string; count: number }>()
  for (const a of weekAppts) {
    const id = a.departmentId
    const cur = volMap.get(id) ?? { name: a.department.name, code: a.department.code, count: 0 }
    cur.count += 1
    volMap.set(id, cur)
  }

  const weeklyVolume = Array.from(volMap.entries()).map(([id, v]) => ({
    departmentId: id,
    name: v.name,
    code: v.code,
    patients: v.count,
  }))

  const rangeAppts = await prisma.appointment.findMany({
    where: { startsAt: { gte: range.from, lte: range.to } },
    select: { status: true, departmentId: true, department: { select: { name: true } } },
  })

  const deptStats = new Map<string, { name: string; total: number; noShow: number }>()
  for (const a of rangeAppts) {
    const id = a.departmentId
    const cur = deptStats.get(id) ?? { name: a.department.name, total: 0, noShow: 0 }
    cur.total += 1
    if (a.status === "NO_SHOW") cur.noShow += 1
    deptStats.set(id, cur)
  }

  const noShowRate = Array.from(deptStats.entries()).map(([departmentId, s]) => ({
    departmentId,
    name: s.name,
    rate: s.total ? Math.round((s.noShow / s.total) * 1000) / 10 : 0,
    noShows: s.noShow,
    total: s.total,
  }))

  return NextResponse.json({
    weeklyVolume,
    noShowRate,
    weekRange: { from: weekStart.toISOString(), to: weekEnd.toISOString() },
  })
}
