import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { emitToRoom } from "@/lib/socket-emit"

const bodySchema = z.object({
  status: z.enum(["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "CANCELLED"]),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const existing = await prisma.labOrder.findUnique({
    where: { id },
    include: { medicalRecord: { include: { patient: true, doctor: true } } },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const next = await prisma.labOrder.update({
    where: { id },
    data:
      parsed.data.status === "COMPLETED"
        ? { status: "COMPLETED", completedAt: existing.completedAt ?? new Date() }
        : { status: parsed.data.status },
  })

  await emitToRoom(`lab_orders`, "lab:order_updated", { id: next.id, status: next.status })
  if (existing.medicalRecord.patientId) {
    await emitToRoom(existing.medicalRecord.patientId, "lab:order_updated", { id: next.id, status: next.status })
  }
  if (existing.medicalRecord.doctorId) {
    await emitToRoom(existing.medicalRecord.doctorId, "lab:order_updated", { id: next.id, status: next.status })
  }

  return NextResponse.json({ ok: true, order: next })
}

