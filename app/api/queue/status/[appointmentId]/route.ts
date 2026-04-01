import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"

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

function tokenNumberFromCode(tokenCode: string): number {
  const parts = tokenCode.split("-")
  const last = parts[parts.length - 1]
  const n = parseInt(last ?? "0", 10)
  return Number.isFinite(n) ? n : 0
}

export async function GET(_req: NextRequest, context: { params: Promise<{ appointmentId: string }> }) {
  try {
    const { appointmentId } = await context.params
    if (!appointmentId?.trim()) {
      return NextResponse.json({ success: false, data: null, error: "appointmentId is required" }, { status: 400 })
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        queueEntry: true,
        doctor: { include: { user: { select: { name: true } } } },
        department: true,
      },
    })

    if (!appointment) {
      return NextResponse.json({ success: false, data: null, error: "Appointment not found" }, { status: 404 })
    }

    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date()
    dayEnd.setHours(23, 59, 59, 999)

    // Use actual average consult duration for this doctor (fallback to schedule)
    const slotDuration = await getEffectiveSlotMinutes(appointment.doctorId)

    // Current IN_PROGRESS appointment for this doctor (today)
    const currentlyServing = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        status: "IN_PROGRESS",
        startsAt: { gte: dayStart, lte: dayEnd },
      },
      select: {
        tokenCode: true,
        startsAt: true,
        patient: { select: { name: true } },
        queueEntry: { select: { startedAt: true } },
      },
    })

    // Time remaining for current patient
    let timeRemainingForCurrent = currentlyServing ? slotDuration : 0
    const startedAt = currentlyServing?.queueEntry?.startedAt
    if (currentlyServing && startedAt) {
      const elapsedMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000)
      timeRemainingForCurrent = Math.max(0, slotDuration - elapsedMinutes)
    }

    // Patients ahead of this patient in queue
    const qe = appointment.queueEntry
    const patientsAhead = qe
      ? await prisma.queueEntry.count({
          where: {
            doctorId: appointment.doctorId,
            status: "WAITING",
            position: { lt: qe.position },
            appointment: {
              doctorId: appointment.doctorId,
              status: "CONFIRMED",
              startsAt: { gte: dayStart, lte: dayEnd },
            },
          },
        })
      : 0

    const estimatedWaitMinutes = timeRemainingForCurrent + patientsAhead * slotDuration
    const estimatedAppointmentTime = new Date(Date.now() + estimatedWaitMinutes * 60000)

    const roomNumber = `${appointment.department.floor}01`

    return NextResponse.json({
      success: true,
      data: {
        tokenCode: appointment.tokenCode,
        tokenNumber: tokenNumberFromCode(appointment.tokenCode),
        status: appointment.status,
        position: qe?.position ?? 0,
        estimatedWaitMinutes,
        estimatedAppointmentTime: estimatedAppointmentTime.toISOString(),
        patientsAhead,
        timeRemainingForCurrent,
        currentlyServing: {
          tokenCode: currentlyServing?.tokenCode ?? null,
          patientName: currentlyServing?.patient?.name ?? null,
          startedAt: startedAt ? startedAt.toISOString() : null,
          elapsedMinutes: startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 60000) : 0,
          timeRemaining: timeRemainingForCurrent,
        },
        doctorName: appointment.doctor.user?.name ?? appointment.doctor.name,
        department: appointment.department.name,
        roomNumber,
        slotDurationMinutes: slotDuration,
      },
      error: null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Queue status error"
    console.error("Queue status error:", error)
    return NextResponse.json({ success: false, data: null, error: message }, { status: 500 })
  }
}
