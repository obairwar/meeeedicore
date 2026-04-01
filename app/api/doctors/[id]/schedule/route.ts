import { NextResponse } from "next/server"
import { z } from "zod"
import type { DayOfWeek } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const dayEnum = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])

const patchSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: dayEnum,
      workStartTime: z.string().min(1),
      workEndTime: z.string().min(1),
      slotDurationMinutes: z.number().int().min(5).max(120),
    })
  ),
})

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const me = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!me || me.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const schedules = await prisma.doctorSchedule.findMany({
    where: { doctorId: id },
    orderBy: { dayOfWeek: "asc" },
  })

  return NextResponse.json({ schedules })
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const me = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!me || me.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  await prisma.$transaction([
    prisma.doctorSchedule.deleteMany({ where: { doctorId: id } }),
    ...parsed.data.schedules.map((s) =>
      prisma.doctorSchedule.create({
        data: {
          doctorId: id,
          dayOfWeek: s.dayOfWeek as DayOfWeek,
          workStartTime: s.workStartTime,
          workEndTime: s.workEndTime,
          slotDurationMinutes: s.slotDurationMinutes,
        },
      })
    ),
  ])

  const schedules = await prisma.doctorSchedule.findMany({ where: { doctorId: id } })
  return NextResponse.json({ ok: true, schedules })
}
