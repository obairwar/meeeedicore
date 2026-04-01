import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { apiErr, apiForbidden, apiOk, apiUnauthorized } from "@/lib/api-response"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return apiUnauthorized()
  if (session.user.role !== "DOCTOR") {
    return apiForbidden()
  }

  let me = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!me && session.user.name) {
    const unlinked = await prisma.doctor.findFirst({
      where: { userId: null, name: session.user.name.trim() },
    })
    if (unlinked) {
      try {
        me = await prisma.doctor.update({
          where: { id: unlinked.id },
          data: { userId: session.user.id },
        })
      } catch {
        me = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
      }
    }
  }
  if (!me) {
    return apiErr("Doctor profile not linked to this account", 404)
  }

  const doctorId = me.id

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [totalBooked, completed, pending, avg] = await Promise.all([
    prisma.appointment.count({ where: { doctorId, startsAt: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } } }),
    prisma.appointment.count({ where: { doctorId, startsAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { doctorId, startsAt: { gte: todayStart, lte: todayEnd }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } } }),
    prisma.queueEntry.findMany({
      where: { doctorId, status: "DONE", startedAt: { not: null }, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 20,
    }).then((rows) => {
      const mins = rows
        .map((r) => {
          if (!r.startedAt || !r.completedAt) return null
          return Math.max(1, Math.round((r.completedAt.getTime() - r.startedAt.getTime()) / 60000))
        })
        .filter((x): x is number => typeof x === "number")
      return mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 15
    }),
  ])

  const queue = await prisma.queueEntry.findMany({
    where: { doctorId, status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
    orderBy: { position: "asc" },
    include: { appointment: { include: { patient: true } } },
  })

  const nextPatient = queue.find((q) => q.status === "WAITING") ?? null

  return apiOk({
    doctorId,
    stats: { totalBooked, completed, pending, avgConsultMinutes: avg },
    nextPatient: nextPatient
      ? {
          queueEntryId: nextPatient.id,
          appointmentId: nextPatient.appointmentId,
          tokenCode: nextPatient.appointment.tokenCode,
          patientName: nextPatient.appointment.patient.name,
          patientDob: nextPatient.appointment.patient.dateOfBirth,
          symptoms: nextPatient.appointment.symptoms,
          consultationType: nextPatient.appointment.consultationType,
        }
      : null,
    queue: queue.map((q) => ({
      id: q.id,
      appointmentId: q.appointmentId,
      tokenCode: q.appointment.tokenCode,
      patientName: q.appointment.patient.name,
      patientDob: q.appointment.patient.dateOfBirth,
      symptoms: q.appointment.symptoms,
      priority: q.appointment.priority,
      status: q.status,
      consultationType: q.appointment.consultationType,
    })),
  })
}

