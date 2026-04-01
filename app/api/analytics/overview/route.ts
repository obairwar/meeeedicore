import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { parseAnalyticsRange, startOfDay } from "@/lib/analytics-range"

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = parseAnalyticsRange(searchParams)

  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const apptToday = await prisma.appointment.count({
    where: { startsAt: { gte: today, lt: tomorrow } },
  })
  const apptYesterday = await prisma.appointment.count({
    where: { startsAt: { gte: yesterday, lt: today } },
  })

  const pctChange =
    apptYesterday === 0 ? (apptToday > 0 ? 100 : 0) : Math.round(((apptToday - apptYesterday) / apptYesterday) * 100)

  const revToday = await prisma.payment.aggregate({
    where: {
      status: "PAID",
      paidAt: { gte: today, lt: tomorrow },
    },
    _sum: { amount: true },
  })

  const beds = await prisma.bed.groupBy({
    by: ["status"],
    _count: { id: true },
  })
  const totalBeds = beds.reduce((s, b) => s + b._count.id, 0)
  const occupied = beds.find((b) => b.status === "OCCUPIED")?._count.id ?? 0

  const queueRows = await prisma.queueEntry.findMany({
    where: {
      status: "DONE",
      completedAt: { gte: range.from, lte: range.to },
      startedAt: { not: null },
    },
    select: { startedAt: true, completedAt: true, estimatedWaitMinutes: true },
  })

  let avgWait = 0
  if (queueRows.length) {
    const mins = queueRows.map((q) => {
      if (q.startedAt && q.completedAt) {
        return Math.max(0, (q.completedAt.getTime() - q.startedAt.getTime()) / 60000)
      }
      return q.estimatedWaitMinutes ?? 0
    })
    avgWait = mins.reduce((a, b) => a + b, 0) / mins.length
  } else {
    const fallback = await prisma.queueEntry.aggregate({
      where: { status: "DONE", updatedAt: { gte: range.from, lte: range.to } },
      _avg: { estimatedWaitMinutes: true },
    })
    avgWait = fallback._avg.estimatedWaitMinutes ?? 0
  }

  return NextResponse.json({
    kpis: {
      appointmentsToday: apptToday,
      appointmentsYesterday: apptYesterday,
      appointmentsChangePct: pctChange,
      revenueToday: revToday._sum.amount ?? 0,
      bedsOccupied: occupied,
      bedsTotal: totalBeds || 1,
      avgQueueWaitMinutes: Math.round(avgWait * 10) / 10,
    },
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
  })
}
