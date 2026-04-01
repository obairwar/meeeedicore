import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { emitToRoom } from "@/lib/socket-emit"
import { QueueService } from "@/lib/queue-service"

const schema = z.object({
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("CRITICAL"),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ appointmentId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { appointmentId } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const qe = await prisma.queueEntry.findUnique({
    where: { appointmentId },
    include: { appointment: true },
  })
  if (!qe) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointmentId }, data: { priority: parsed.data.priority } })

    const waiting = await tx.queueEntry.findMany({
      where: { doctorId: qe.doctorId, status: "WAITING" },
      orderBy: { position: "asc" },
    })

    const target = waiting.find((w) => w.appointmentId === appointmentId)
    if (!target) return

    const ahead = waiting.filter((w) => w.position < target.position)
    for (const a of ahead) {
      await tx.queueEntry.update({ where: { id: a.id }, data: { position: a.position + 1 } })
    }
    await tx.queueEntry.update({ where: { id: target.id }, data: { position: 1 } })
  })

  await QueueService.recalculateEstimates(qe.doctorId)
  await emitToRoom(qe.doctorId, "queue:updated", { doctorId: qe.doctorId })

  return NextResponse.json({ ok: true })
}

