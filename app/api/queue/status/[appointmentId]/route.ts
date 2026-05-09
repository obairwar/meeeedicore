import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"

const QUEUE_ESTIMATE_MINUTES_PER_PATIENT = 6

async function getEffectiveSlotMinutes(doctorId: string): Promise<number> {
  // Product decision: use a fixed per-patient estimate for the live queue.
  // (We still store schedule durations separately for appointment length.)
  void doctorId
  return QUEUE_ESTIMATE_MINUTES_PER_PATIENT

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

function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
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

    // Compute the queue window for the *appointment day* (not "today"),
    // otherwise future bookings always show 0 patients ahead.
    const dayStart = new Date(appointment.startsAt)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(appointment.startsAt)
    dayEnd.setHours(23, 59, 59, 999)
    const queueIsLiveToday = isSameLocalDay(new Date(appointment.startsAt), new Date())

    // Use actual average consult duration for this doctor (fallback to schedule)
    const slotDuration = await getEffectiveSlotMinutes(appointment.doctorId)

    // Only show "now serving" when it's the appointment's queue day.
    const currentlyServing = queueIsLiveToday
      ? await prisma.appointment.findFirst({
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
      : null

    // Time remaining for current patient
    let timeRemainingForCurrent = currentlyServing ? slotDuration : 0
    const startedAt = currentlyServing?.queueEntry?.startedAt
    if (currentlyServing && startedAt) {
      const elapsedMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000)
      timeRemainingForCurrent = Math.max(0, slotDuration - elapsedMinutes)
    }

    // If it's not the appointment day, don't show a "live queue" position/wait.
    if (!queueIsLiveToday) {
      const roomNumber = `${appointment.department.floor}01`
      return NextResponse.json({
        success: true,
        data: {
          doctorId: appointment.doctorId,
          appointmentStartsAt: appointment.startsAt.toISOString(),
          queueIsLiveToday,
          tokenCode: appointment.tokenCode,
          tokenNumber: tokenNumberFromCode(appointment.tokenCode),
          status: appointment.status,
          position: 0,
          estimatedWaitMinutes: 0,
          // For future bookings, "expected at" is the scheduled appointment time.
          estimatedAppointmentTime: appointment.startsAt.toISOString(),
          patientsAhead: 0,
          waitingAhead: 0,
          timeRemainingForCurrent: 0,
          currentlyServing: {
            tokenCode: null,
            patientName: null,
            startedAt: null,
            elapsedMinutes: 0,
            timeRemaining: 0,
          },
          doctorName: appointment.doctor.user?.name ?? appointment.doctor.name,
          department: appointment.department.name,
          roomNumber,
          slotDurationMinutes: slotDuration,
        },
        error: null,
      })
    }

    // Patients ahead (WAITING only, excludes current IN_CONSULTATION)
    const qe = appointment.queueEntry
    const waitingAhead = qe
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

    const isYouCurrentlyServing = currentlyServing?.tokenCode === appointment.tokenCode
    const currentAhead = currentlyServing && !isYouCurrentlyServing ? 1 : 0
    const patientsAhead = waitingAhead + currentAhead

    const estimatedWaitMinutes = timeRemainingForCurrent + waitingAhead * slotDuration
    const estimatedAppointmentTime = new Date(Date.now() + estimatedWaitMinutes * 60000)

    const roomNumber = `${appointment.department.floor}01`

    return NextResponse.json({
      success: true,
      data: {
        doctorId: appointment.doctorId,
        appointmentStartsAt: appointment.startsAt.toISOString(),
        queueIsLiveToday,
        tokenCode: appointment.tokenCode,
        tokenNumber: tokenNumberFromCode(appointment.tokenCode),
        status: appointment.status,
        position: qe?.position ?? 0,
        estimatedWaitMinutes,
        estimatedAppointmentTime: estimatedAppointmentTime.toISOString(),
        patientsAhead,
        waitingAhead,
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
