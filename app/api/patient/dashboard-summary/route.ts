import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const uid = session.user.id
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    appointmentsThisMonth,
    consultationsDone,
    pendingPayments,
    familyCount,
    todayAppointments,
    upcoming,
    recentRecords,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { patientId: uid, startsAt: { gte: monthStart } },
    }),
    prisma.appointment.count({
      where: { patientId: uid, status: "COMPLETED" },
    }),
    prisma.payment.count({
      where: { status: "PENDING", appointment: { patientId: uid } },
    }),
    prisma.familyMember.count({ where: { userId: uid } }),
    prisma.appointment.findMany({
      where: {
        patientId: uid,
        startsAt: { gte: startOfDay, lt: endOfDay },
        status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
      },
      orderBy: { startsAt: "asc" },
      include: { doctor: true, department: true, queueEntry: true },
    }),
    prisma.appointment.findMany({
      where: {
        patientId: uid,
        startsAt: { gte: now },
        status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
      include: { doctor: true, department: true },
    }),
    prisma.medicalRecord.findMany({
      where: { patientId: uid },
      orderBy: { createdAt: "desc" },
      take: 2,
      include: { doctor: true },
    }),
  ])

  const primaryToday = todayAppointments[0]
  let queueLive: {
    appointmentId: string
    tokenCode: string
    doctorName: string
    departmentName: string
    startsAt: string
    nowServing: string | null
    yourToken: string
    ahead: number
    waitMinutes: number
    roomLabel: string
  } | null = null

  if (primaryToday?.queueEntry) {
    const dayEnd = new Date(startOfDay)
    dayEnd.setHours(23, 59, 59, 999)

    const currentlyServing = await prisma.appointment.findFirst({
      where: {
        doctorId: primaryToday.doctorId,
        status: "IN_PROGRESS",
        startsAt: { gte: startOfDay, lte: dayEnd },
      },
      select: { tokenCode: true },
    })

    const aheadCount = await prisma.queueEntry.count({
      where: {
        doctorId: primaryToday.doctorId,
        position: { lt: primaryToday.queueEntry.position },
        status: { not: "DONE" },
      },
    })

    const schedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId: primaryToday.doctorId },
    })
    const slotM = schedule?.slotDurationMinutes ?? 15
    const waitMinutes = Math.max(aheadCount * slotM, primaryToday.queueEntry.estimatedWaitMinutes ?? 0)

    queueLive = {
      appointmentId: primaryToday.id,
      tokenCode: primaryToday.tokenCode,
      doctorName: primaryToday.doctor.name,
      departmentName: primaryToday.department.name,
      startsAt: primaryToday.startsAt.toISOString(),
      nowServing: currentlyServing?.tokenCode ?? null,
      yourToken: primaryToday.tokenCode,
      ahead: aheadCount,
      waitMinutes,
      roomLabel: `${primaryToday.department.floor}01`,
    }
  }

  return NextResponse.json({
    stats: {
      appointmentsThisMonth,
      consultationsDone,
      pendingPayments,
      familyCount,
    },
    upcoming: upcoming.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      tokenCode: a.tokenCode,
      status: a.status,
      doctorName: a.doctor.name,
      departmentName: a.department.name,
      consultationType: a.consultationType,
    })),
    queueLive,
    recentRecords: recentRecords.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      diagnosis: r.diagnosis ?? "Consultation",
      doctorName: r.doctor?.name ?? "—",
    })),
  })
}
