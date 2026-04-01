import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notification-service"

const bodySchema = z.object({
  prescriptionIds: z.array(z.string().min(1)).min(1),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const record = await prisma.medicalRecord.findUnique({
    where: { id },
    include: {
      patient: true,
      appointment: true,
      prescriptions: true,
    },
  })
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const allowed = new Set(record.prescriptions.map((p) => p.id))
  const ids = parsed.data.prescriptionIds.filter((pid) => allowed.has(pid))
  if (ids.length === 0) return NextResponse.json({ error: "No valid prescription items selected" }, { status: 400 })

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    const items = await tx.prescription.findMany({ where: { id: { in: ids } } })
    await tx.prescription.updateMany({
      where: { id: { in: ids }, dispensedAt: null },
      data: { dispensedAt: now, dispensedByUserId: userId },
    })

    for (const it of items) {
      const inv = await tx.inventoryItem.findUnique({ where: { name: it.medicineName } })
      if (!inv) continue
      await tx.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: Math.max(0, inv.quantity - 1) },
      })
    }
  })

  const notifier = new NotificationService()
  await notifier.send(record.patientId, {
    title: "Prescription ready for pickup",
    message: `Your prescription${record.appointment?.tokenCode ? ` (${record.appointment.tokenCode})` : ""} has been dispensed and is ready.`,
    channels: ["IN_APP", "WHATSAPP"],
    type: "SUCCESS",
    data: { medicalRecordId: record.id },
  })

  return NextResponse.json({ ok: true })
}

