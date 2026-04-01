import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

async function getEffectiveSlotMinutes(doctorId: string): Promise<number> {
  const schedule = await prisma.doctorSchedule.findFirst({
    where: { doctorId },
    select: { slotDurationMinutes: true },
  })
  const fallback = schedule?.slotDurationMinutes ?? 15

  const recent = await prisma.queueEntry.findMany({
    where: { doctorId, status: "DONE", startedAt: { not: null }, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 20,
    select: { startedAt: true, completedAt: true },
  })

  const durations = recent
    .map((r) => {
      if (!r.startedAt || !r.completedAt) return null
      const mins = (r.completedAt.getTime() - r.startedAt.getTime()) / 60000
      return mins > 0 ? mins : null
    })
    .filter((x): x is number => typeof x === "number")

  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : fallback
  return Math.min(60, Math.max(3, avg))
}

export async function GET(_req: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { doctorId } = await context.params

  const me = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!me || me.id !== doctorId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date()
  dayEnd.setHours(23, 59, 59, 999)

  try {
    const slotDurationMinutes = await getEffectiveSlotMinutes(doctorId)

    const currentAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: "IN_PROGRESS",
        startsAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        patient: {
          select: {
            name: true,
            dateOfBirth: true,
            bloodGroup: true,
            gender: true,
            phone: true,
          },
        },
        queueEntry: true,
        department: true,
      },
    })

    const queue = await prisma.queueEntry.findMany({
      where: {
        doctorId,
        status: "WAITING",
        appointment: {
          doctorId,
          status: "CONFIRMED",
          startsAt: { gte: dayStart, lte: dayEnd },
        },
      },
      include: {
        appointment: {
          include: {
            patient: { select: { name: true, dateOfBirth: true, bloodGroup: true } },
          },
        },
      },
      orderBy: { position: "asc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        currentlyServing: currentAppointment,
        queue,
        queueLength: queue.length,
        slotDurationMinutes,
        // Backward compatibility (older UI used avgWaitMinutes)
        avgWaitMinutes: slotDurationMinutes,
      },
      error: null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Queue GET failed"
    console.error("Queue GET error:", error)
    return NextResponse.json({ success: false, data: null, error: message }, { status: 500 })
  }
}
