import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notification-service"
import { formatCurrency } from "@/lib/utils"

const patchSchema = z.object({
  status: z.literal("PAID"),
})

/**
 * Confirm a payment (e.g. after Razorpay success or manual reception desk confirmation).
 * Triggers Email + In-app notification to the patient.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  const role = session?.user?.role
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body (expected { status: \"PAID\" })" }, { status: 400 })

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { appointment: true },
  })
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isPatient = payment.appointment.patientId === userId
  const isStaff = role === "ADMIN" || role === "RECEPTIONIST"
  if (!isPatient && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (payment.status === "PAID") {
    return NextResponse.json({ ok: true, payment, alreadyPaid: true })
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: { status: "PAID" },
  })

  const notifier = new NotificationService()
  await notifier.send(payment.appointment.patientId, {
    title: "Payment confirmed",
    message: `Your payment of ${formatCurrency(updated.amount)} for appointment ${payment.appointment.tokenCode} was confirmed.`,
    channels: ["EMAIL", "IN_APP"],
    type: "SUCCESS",
    data: { paymentId: id, appointmentId: payment.appointmentId, tokenCode: payment.appointment.tokenCode },
  })

  return NextResponse.json({ ok: true, payment: updated })
}
