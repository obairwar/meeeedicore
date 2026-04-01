import { prisma } from "@/lib/prisma"
import { QueueService } from "@/lib/queue-service"
import { emitToRoom } from "@/lib/socket-emit"

export async function emitQueueUpdated(doctorId: string) {
  const queueLength = await prisma.queueEntry.count({
    where: { doctorId, status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
  })
  await emitToRoom(doctorId, "queue:updated", { doctorId, queueLength })
}

/** Active queue rows for a doctor, ordered by position */
export async function getActiveEntries(doctorId: string) {
  return prisma.queueEntry.findMany({
    where: { doctorId, status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
    orderBy: { position: "asc" },
    include: { appointment: { include: { patient: true } } },
  })
}

export async function renumberPositions(doctorId: string) {
  const rows = await getActiveEntries(doctorId)
  await prisma.$transaction(
    rows.map((r, i) =>
      prisma.queueEntry.update({
        where: { id: r.id },
        data: { position: i + 1 },
      })
    )
  )
  await QueueService.recalculateEstimates(doctorId)
}


/** Move appointment to front among WAITING only */
export async function prioritizeAppointment(appointmentId: string) {
  const qe = await prisma.queueEntry.findUnique({
    where: { appointmentId },
    include: { appointment: true },
  })
  if (!qe) throw new Error("Queue entry not found")
  if (qe.status !== "WAITING") throw new Error("Only waiting patients can be prioritized")
  const doctorId = qe.doctorId

  const rows = await prisma.queueEntry.findMany({
    where: { doctorId, status: "WAITING" },
    orderBy: { position: "asc" },
    include: { appointment: { include: { patient: true } } },
  })
  const others = rows.filter((r) => r.appointmentId !== appointmentId)
  const target = rows.find((r) => r.appointmentId === appointmentId)
  if (!target) throw new Error("Not in waiting queue")
  const ordered = [target, ...others]

  await prisma.$transaction(
    ordered.map((r, i) =>
      prisma.queueEntry.update({
        where: { id: r.id },
        data: { position: i + 1 },
      })
    )
  )

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { priority: "EMERGENCY" },
  })

  await QueueService.recalculateEstimates(doctorId)
  await emitQueueUpdated(doctorId)
}

/** Move appointment to end of WAITING queue */
export async function skipAppointment(appointmentId: string) {
  const qe = await prisma.queueEntry.findUnique({
    where: { appointmentId },
    include: { appointment: true },
  })
  if (!qe) throw new Error("Queue entry not found")
  if (qe.status !== "WAITING") throw new Error("Only waiting patients can be skipped")
  const doctorId = qe.doctorId

  const rows = await prisma.queueEntry.findMany({
    where: { doctorId, status: "WAITING" },
    orderBy: { position: "asc" },
    include: { appointment: { include: { patient: true } } },
  })
  const target = rows.find((r) => r.appointmentId === appointmentId)
  if (!target) throw new Error("Not in waiting queue")
  const others = rows.filter((r) => r.appointmentId !== appointmentId)
  const ordered = [...others, target]

  await prisma.$transaction(
    ordered.map((r, i) =>
      prisma.queueEntry.update({
        where: { id: r.id },
        data: { position: i + 1 },
      })
    )
  )

  await QueueService.recalculateEstimates(doctorId)
  await emitQueueUpdated(doctorId)
}

export async function markNoShow(appointmentId: string) {
  const qe = await prisma.queueEntry.findUnique({ where: { appointmentId } })
  if (!qe) throw new Error("Queue entry not found")
  const doctorId = qe.doctorId

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "NO_SHOW" },
    }),
    prisma.queueEntry.update({
      where: { id: qe.id },
      data: { status: "CANCELLED", completedAt: new Date() },
    }),
  ])

  await renumberPositions(doctorId)
  await emitQueueUpdated(doctorId)
}

/** Call a specific patient (receptionist): complete current consult, start this one */
export async function callSpecificPatient(appointmentId: string, roomNumber = "101") {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { queueEntry: true, patient: true },
  })
  if (!appt?.queueEntry) throw new Error("Appointment has no queue entry")
  const doctorId = appt.doctorId

  await prisma.$transaction(async (tx) => {
    const current = await tx.queueEntry.findFirst({
      where: { doctorId, status: { in: ["CALLED", "IN_CONSULTATION"] } },
      orderBy: { position: "asc" },
      include: { appointment: true },
    })

    if (current && current.appointmentId !== appointmentId) {
      await tx.queueEntry.update({
        where: { id: current.id },
        data: { status: "DONE", completedAt: new Date() },
      })
      await tx.appointment.update({
        where: { id: current.appointmentId },
        data: { status: "COMPLETED" },
      })
    }

    const qe = await tx.queueEntry.findUnique({ where: { appointmentId } })
    if (!qe) throw new Error("Queue entry missing")

    await tx.queueEntry.update({
      where: { id: qe.id },
      data: {
        status: "IN_CONSULTATION",
        calledAt: new Date(),
        startedAt: new Date(),
      },
    })
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "IN_PROGRESS" },
    })
  })

  await QueueService.recalculateEstimates(doctorId)
  await emitQueueUpdated(doctorId)
  await emitToRoom(appointmentId, "patient:your_turn", {
    appointmentId,
    tokenCode: appt.tokenCode,
    roomNumber,
  })
}
