import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function roomNumbersForDept(floor: string, rooms: number) {
  const r = Math.max(1, rooms)
  return [`${floor}01`, `${floor}${String(Math.min(r, 99)).padStart(2, "0")}`]
}

function priorityLabel(p: string) {
  if (p === "EMERGENCY") return "EMERGENCY"
  if (p === "CRITICAL" || p === "HIGH") return "URGENT"
  return "NORMAL"
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [
    totalToday,
    inQueue,
    beingServed,
    completed,
    noShows,
    departments,
    recentRegs,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { startsAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: todayStart, lte: todayEnd },
        status: "CONFIRMED",
      },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: todayStart, lte: todayEnd },
        status: "IN_PROGRESS",
      },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED",
      },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: todayStart, lte: todayEnd },
        status: "NO_SHOW",
      },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        doctors: { select: { id: true, name: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        patient: { select: { name: true } },
        department: { select: { name: true } },
      },
    }),
  ])

  const deptPayload = []

  for (const d of departments) {
    const doctorIds = d.doctors.map((x) => x.id)
    if (doctorIds.length === 0) {
      deptPayload.push({
        id: d.id,
        name: d.name,
        floor: d.floor,
        roomNumbers: roomNumbersForDept(d.floor, d.rooms),
        currentlyServing: null as { tokenCode: string; patientName: string; doctorName: string } | null,
        queue: [] as Array<{
          appointmentId: string
          position: number
          tokenCode: string
          patientName: string
          priority: string
          priorityLabel: string
          estimatedWaitMinutes: number
          doctorName: string
        }>,
        queueLength: 0,
        completedToday: 0,
      })
      continue
    }

    const inProgress = await prisma.appointment.findFirst({
      where: {
        doctorId: { in: doctorIds },
        startsAt: { gte: todayStart, lte: todayEnd },
        status: "IN_PROGRESS",
      },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    })

    const queueRows = await prisma.queueEntry.findMany({
      where: {
        doctorId: { in: doctorIds },
        status: "WAITING",
        appointment: {
          startsAt: { gte: todayStart, lte: todayEnd },
          status: "CONFIRMED",
        },
      },
      orderBy: [{ doctorId: "asc" }, { position: "asc" }],
      include: {
        appointment: {
          include: {
            patient: { select: { name: true } },
            doctor: { select: { name: true } },
          },
        },
      },
    })

    const completedToday = await prisma.appointment.count({
      where: {
        departmentId: d.id,
        startsAt: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED",
      },
    })

    deptPayload.push({
      id: d.id,
      name: d.name,
      floor: d.floor,
      roomNumbers: roomNumbersForDept(d.floor, d.rooms),
      doctorIds,
      currentlyServing: inProgress
        ? {
            tokenCode: inProgress.tokenCode,
            patientName: inProgress.patient.name,
            doctorName: inProgress.doctor.name,
          }
        : null,
      queue: queueRows.map((q) => ({
        appointmentId: q.appointmentId,
        position: q.position,
        tokenCode: q.appointment.tokenCode,
        patientName: q.appointment.patient.name,
        priority: q.appointment.priority,
        priorityLabel: priorityLabel(q.appointment.priority),
        estimatedWaitMinutes: q.estimatedWaitMinutes,
        doctorName: q.appointment.doctor.name,
      })),
      queueLength: queueRows.length,
      completedToday,
    })
  }

  return NextResponse.json({
    totalToday,
    inQueue,
    beingServed,
    completed,
    noShows,
    departments: deptPayload,
    recentRegistrations: recentRegs.map((a) => ({
      id: a.id,
      patientName: a.patient.name,
      tokenCode: a.tokenCode,
      department: a.department.name,
      createdAt: a.createdAt.toISOString(),
      status: a.status,
    })),
  })
}
