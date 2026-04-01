import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const querySchema = z.object({
  date: z.string().min(1),
})

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ date: url.searchParams.get("date") })
  if (!parsed.success) return NextResponse.json({ error: "Missing date" }, { status: 400 })

  const params = await context.params
  const date = new Date(parsed.data.date)
  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 })

  const doctor = await prisma.doctor.findUnique({
    where: { id: params.id },
    include: { schedules: true },
  })
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 })

  const dayOfWeek = DAYS[date.getDay()]
  const schedule = doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek)
  if (!schedule) return NextResponse.json({ slots: [] })

  const startM = toMinutes(schedule.workStartTime)
  const endM = toMinutes(schedule.workEndTime)
  const dur = schedule.slotDurationMinutes

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const appts = await prisma.appointment.findMany({
    where: { doctorId: doctor.id, startsAt: { gte: dayStart, lte: dayEnd }, status: { not: "CANCELLED" } },
    select: { startsAt: true },
  })
  const booked = new Set(appts.map((a) => `${a.startsAt.getHours()}:${a.startsAt.getMinutes()}`))

  const slots: { time: string; available: boolean }[] = []
  for (let m = startM; m + dur <= endM; m += dur) {
    const time = fromMinutes(m)
    const [hh, mm] = time.split(":").map(Number)
    const key = `${hh}:${mm}`
    slots.push({ time, available: !booked.has(key) })
  }

  return NextResponse.json({ slots })
}

