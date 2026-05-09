import { prisma } from "@/lib/prisma"

const QUEUE_ESTIMATE_MINUTES_PER_PATIENT = 6

export class QueueService {
  private async getEffectiveSlotMinutes(doctorId: string): Promise<number> {
    // Product decision: use a fixed per-patient estimate for queue wait times.
    // (Doctor schedule duration can still represent booked appointment length.)
    void doctorId
    return QUEUE_ESTIMATE_MINUTES_PER_PATIENT

    const schedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId },
      select: { slotDurationMinutes: true },
    })
    const fallback = schedule?.slotDurationMinutes ?? 15

    // Rolling avg from last 20 completed consults (queue entries)
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

    // Clamp to avoid insane results from bad data
    return Math.min(60, Math.max(3, avg))
  }

  static async enqueue(appointmentId: string) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true },
    })
    if (!appt) throw new Error("Appointment not found")

    const activeCount = await prisma.queueEntry.count({
      where: {
        doctorId: appt.doctorId,
        status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] },
      },
    })

    const schedule = await prisma.doctorSchedule.findFirst({
      where: { doctorId: appt.doctorId },
    })
    const avgSlot = schedule?.slotDurationMinutes ?? 15
    const position = activeCount + 1

    const qe = await prisma.queueEntry.create({
      data: {
        appointmentId,
        doctorId: appt.doctorId,
        position,
        estimatedWaitMinutes: position * avgSlot,
      },
    })

    return qe
  }

  async recalculateEstimates(doctorId: string): Promise<void> {
    const slotDuration = await this.getEffectiveSlotMinutes(doctorId)

    // Current IN_PROGRESS appointment (today)
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date()
    dayEnd.setHours(23, 59, 59, 999)

    const currentAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: "IN_PROGRESS",
        startsAt: { gte: dayStart, lte: dayEnd },
      },
      include: { queueEntry: true },
    })

    // How much time remaining in the current slot
    let timeRemainingForCurrent = 0
    if (currentAppointment) {
      timeRemainingForCurrent = slotDuration
      const startedAt = currentAppointment.queueEntry?.startedAt
      if (startedAt) {
        const elapsedMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000)
        timeRemainingForCurrent = Math.max(0, slotDuration - elapsedMinutes)
      }
    }

    // Waiting queue ordered by position
    const waitingQueue = await prisma.queueEntry.findMany({
      where: {
        doctorId,
        status: "WAITING",
        appointment: {
          doctorId,
          status: "CONFIRMED",
          startsAt: { gte: dayStart, lte: dayEnd },
        },
      },
      orderBy: { position: "asc" },
    })

    // Recalculate wait times using:
    // wait = (slotDuration - elapsedForCurrentPatient) + (patientsAhead × slotDuration)
    await prisma.$transaction(
      waitingQueue.map((q, i) =>
        prisma.queueEntry.update({
          where: { id: q.id },
          data: {
            position: i + 1,
            estimatedWaitMinutes: timeRemainingForCurrent + i * slotDuration,
          },
        })
      )
    )
  }

  static async recalculateEstimates(doctorId: string): Promise<void> {
    const svc = new QueueService()
    await svc.recalculateEstimates(doctorId)
  }

  static async getPredictedWait(doctorId: string, position: number) {
    const schedule = await prisma.doctorSchedule.findFirst({ where: { doctorId } })
    const fallback = schedule?.slotDurationMinutes ?? 15
    return position * fallback
  }

  static async getStatus(appointmentId: string) {
    const qe = await prisma.queueEntry.findUnique({
      where: { appointmentId },
      include: { appointment: { include: { doctor: true, department: true } } },
    })
    if (!qe) throw new Error("Queue entry not found")

    const totalInQueue = await prisma.queueEntry.count({
      where: { doctorId: qe.doctorId, status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
    })

    const currentlyServing = await prisma.queueEntry.findFirst({
      where: { doctorId: qe.doctorId, status: { in: ["CALLED", "IN_CONSULTATION"] } },
      orderBy: { position: "asc" },
      include: { appointment: true },
    })

    return {
      appointmentId,
      doctorId: qe.doctorId,
      tokenCode: qe.appointment.tokenCode,
      status: qe.appointment.status,
      queueStatus: qe.status,
      position: qe.position,
      estimatedWaitMinutes: qe.estimatedWaitMinutes,
      totalInQueue,
      currentlyServing: currentlyServing?.appointment.tokenCode ?? null,
    }
  }
}

