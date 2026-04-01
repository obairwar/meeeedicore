import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } })

  // Active queues grouped by department (via doctors in that dept)
  const activeQ = await prisma.queueEntry.findMany({
    where: { status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
    include: { doctor: { include: { department: true } }, appointment: true },
  })

  const byDept = new Map<
    string,
    { departmentId: string; name: string; code: string; currentToken: string | null; queueLength: number; avgWait: number }
  >()

  for (const d of departments) {
    byDept.set(d.id, { departmentId: d.id, name: d.name, code: d.code, currentToken: null, queueLength: 0, avgWait: 0 })
  }

  const waits: Record<string, number[]> = {}
  for (const q of activeQ) {
    const deptId = q.doctor.departmentId
    const bucket = byDept.get(deptId)
    if (!bucket) continue
    bucket.queueLength += 1
    waits[deptId] = waits[deptId] ?? []
    waits[deptId].push(q.estimatedWaitMinutes)
    if (q.status !== "WAITING") {
      bucket.currentToken = q.appointment.tokenCode
    }
  }

  for (const [deptId, arr] of Object.entries(waits)) {
    const bucket = byDept.get(deptId)
    if (!bucket) continue
    bucket.avgWait = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  }

  const [walkIns, totalAppointments, bedsOccupied, bedsAvailable, emergencyAppointments] = await Promise.all([
    prisma.appointment.count({ where: { isWalkIn: true, startsAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.appointment.count({ where: { startsAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.bed.count({ where: { status: "OCCUPIED" } }),
    prisma.bed.count({ where: { status: "AVAILABLE" } }),
    prisma.appointment.findMany({
      where: { priority: "CRITICAL", startsAt: { gte: todayStart, lte: todayEnd }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      take: 10,
      include: { patient: true, doctor: true, department: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return NextResponse.json({
    queues: Array.from(byDept.values()),
    summary: { walkIns, totalAppointments, bedsOccupied, bedsAvailable },
    urgentAlerts: {
      emergencyPatients: emergencyAppointments.map((a) => ({
        appointmentId: a.id,
        tokenCode: a.tokenCode,
        patientName: a.patient.name,
        department: a.department.name,
        doctor: a.doctor.name,
      })),
      maintenanceRequests: [],
    },
  })
}

