import { NextResponse } from "next/server"
import { z } from "zod"
import Razorpay from "razorpay"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ensurePaymentForAppointment } from "@/lib/ensure-payment"

export const runtime = "nodejs"

const bodySchema = z.object({
  appointmentId: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const appt = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, patientId: session.user.id },
  })
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })

  let payment = await ensurePaymentForAppointment(appt.id)
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

  if (payment.status === "PAID") {
    return NextResponse.json({
      alreadyPaid: true,
      invoiceUrl: payment.invoiceUrl,
      razorpayOrderId: payment.razorpayOrderId,
    })
  }

  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })
  const amountPaise = Math.round(payment.amount * 100)
  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: payment.currency || "INR",
    receipt: payment.id.slice(0, 40),
    notes: { appointmentId: appt.id, paymentId: payment.id },
  })

  payment = await prisma.payment.update({
    where: { id: payment.id },
    data: { razorpayOrderId: order.id },
  })

  return NextResponse.json({
    keyId,
    orderId: order.id,
    amount: payment.amount,
    currency: payment.currency,
    paymentId: payment.id,
  })
}
