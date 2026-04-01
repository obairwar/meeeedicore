import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { parseAnalyticsRange } from "@/lib/analytics-range"

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

function dayIndex(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 6 : js - 1
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = parseAnalyticsRange(searchParams)

  const appts = await prisma.appointment.findMany({
    where: { startsAt: { gte: range.from, lte: range.to } },
    select: { startsAt: true },
  })

  const grid: number[][] = DAYS.map(() => HOURS.map(() => 0))
  let max = 1
  for (const a of appts) {
    const h = a.startsAt.getHours()
    if (!HOURS.includes(h)) continue
    const hi = HOURS.indexOf(h)
    const di = dayIndex(a.startsAt)
    grid[di][hi] += 1
    max = Math.max(max, grid[di][hi])
  }

  return NextResponse.json({
    hours: HOURS,
    days: DAYS,
    grid,
    max,
  })
}
