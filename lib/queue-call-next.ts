import { prisma } from "@/lib/prisma"
import { QueueService } from "@/lib/queue-service"
import { emitToRoom } from "@/lib/socket-emit"

export async function runCallNext(doctorId: string, roomNumber: string) {
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.queueEntry.findFirst({
      where: { doctorId, status: { in: ["CALLED", "IN_CONSULTATION"] } },
      orderBy: { position: "asc" },
      include: { appointment: true },
    })

    if (current) {
      await tx.queueEntry.update({
        where: { id: current.id },
        data: { status: "DONE", completedAt: new Date() },
      })
      await tx.appointment.update({
        where: { id: current.appointmentId },
        data: { status: "COMPLETED" },
      })
    }

    const next = await tx.queueEntry.findFirst({
      where: { doctorId, status: "WAITING" },
      orderBy: { position: "asc" },
      include: { appointment: { include: { patient: true } } },
    })
    if (!next) {
      return { nextCalled: null as typeof next, remaining: [] as { id: string }[] }
    }

    const updatedNext = await tx.queueEntry.update({
      where: { id: next.id },
      data: {
        status: "CALLED",
        calledAt: new Date(),
        startedAt: new Date(),
      },
      include: { appointment: { include: { patient: true } } },
    })

    await tx.appointment.update({
      where: { id: next.appointmentId },
      data: { status: "IN_PROGRESS" },
    })

    const remaining = await tx.queueEntry.findMany({
      where: { doctorId, status: "WAITING" },
      orderBy: { position: "asc" },
      select: { id: true },
    })

    return { nextCalled: updatedNext, remaining }
  })

  await QueueService.recalculateEstimates(doctorId)

  const queueLength = await prisma.queueEntry.count({
    where: { doctorId, status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
  })

  await emitToRoom(doctorId, "queue:updated", { doctorId, queueLength })

  if (result.nextCalled) {
    await emitToRoom(result.nextCalled.appointmentId, "patient:your_turn", {
      appointmentId: result.nextCalled.appointmentId,
      tokenCode: result.nextCalled.appointment.tokenCode,
      roomNumber,
    })
  }

  return { result, queueLength }
}
