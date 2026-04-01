import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { QueueService } from "@/lib/queue-service"
import { auth } from "@/lib/auth"
import { emitToRoom } from "@/lib/socket-emit"
import { NotificationService } from "@/lib/notification-service"
import { formatQueueMessage, getNotificationBundle } from "@/lib/notification-locale"
import { sendWebPushToUser } from "@/lib/push-web"

const bodySchema = z.object({
  roomNumber: z.string().optional(),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { doctorId } = await context.params
  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const roomNumber = parsed.data.roomNumber ?? "204"

  const myDoctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!myDoctor || myDoctor.id !== doctorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.queueEntry.findFirst({
      where: { doctorId, status: { in: ["CALLED", "IN_CONSULTATION"] } },
      orderBy: { position: "asc" },
      include: { appointment: true },
    })

    if (current) {
      await tx.queueEntry.update({
        where: { id: current.id },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
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
    if (!next) return { currentToken: current?.appointment.tokenCode ?? null, nextCalled: null, third: null }

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

    const third = await tx.queueEntry.findFirst({
      where: { doctorId, status: "WAITING", position: updatedNext.position + 2 },
      include: { appointment: true },
    })

    return {
      currentToken: current?.appointment.tokenCode ?? null,
      nextCalled: updatedNext,
      third,
    }
  })

  await QueueService.recalculateEstimates(doctorId)

  const queueLength = await prisma.queueEntry.count({
    where: { doctorId, status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
  })

  await emitToRoom(doctorId, "queue:updated", {
    doctorId,
    currentToken: result.nextCalled?.appointment?.tokenCode ?? null,
    queueLength,
  })

  if (result.nextCalled) {
    const notifier = new NotificationService()
    const bundle = getNotificationBundle(result.nextCalled.appointment.patient.preferredLanguage)
    const titleTurn = bundle.notifications.yourTurnTitle
    const bodyTurn = formatQueueMessage(bundle.notifications.yourTurnBody, {
      room: roomNumber,
      token: result.nextCalled.appointment.tokenCode,
    })

    await emitToRoom(doctorId, "queue:next_called", {
      doctorId,
      tokenCode: result.nextCalled.appointment.tokenCode,
      roomNumber,
    })

    await emitToRoom(result.nextCalled.appointmentId, "patient:your_turn", {
      appointmentId: result.nextCalled.appointmentId,
      roomNumber,
    })

    await notifier.send(result.nextCalled.appointment.patientId, {
      title: titleTurn,
      message: bodyTurn,
      channels: ["IN_APP", "WHATSAPP"],
      type: "INFO",
      data: { appointmentId: result.nextCalled.appointmentId, roomNumber, tokenCode: result.nextCalled.appointment.tokenCode },
    })

    await sendWebPushToUser(result.nextCalled.appointment.patientId, {
      title: titleTurn,
      body: bodyTurn,
      tag: "queue-your-turn",
      data: { appointmentId: result.nextCalled.appointmentId },
    })
  }

  const twoAhead = await prisma.queueEntry.findFirst({
    where: { doctorId, status: "WAITING" },
    orderBy: { position: "asc" },
    skip: 1,
    include: { appointment: { include: { patient: true } } },
  })
  if (twoAhead) {
    await emitToRoom(twoAhead.appointmentId, "patient:alert_2_ahead", { appointmentId: twoAhead.appointmentId })

    const notifier = new NotificationService()
    const bundle2 = getNotificationBundle(twoAhead.appointment.patient.preferredLanguage)
    const title2 = bundle2.notifications.twoAheadTitle
    const body2 = formatQueueMessage(bundle2.notifications.twoAheadBody, {
      token: twoAhead.appointment.tokenCode,
    })

    await notifier.send(twoAhead.appointment.patientId, {
      title: title2,
      message: body2,
      channels: ["IN_APP", "WHATSAPP"],
      type: "INFO",
      data: { appointmentId: twoAhead.appointmentId, tokenCode: twoAhead.appointment.tokenCode, kind: "ALERT_2_AHEAD" },
    })

    await sendWebPushToUser(twoAhead.appointment.patientId, {
      title: title2,
      body: body2,
      tag: "queue-2-ahead",
      data: { appointmentId: twoAhead.appointmentId },
    })
  }

  return NextResponse.json({ ok: true })
}

