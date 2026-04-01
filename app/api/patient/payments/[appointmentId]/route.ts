import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ensurePaymentForAppointment } from "@/lib/ensure-payment"
import { parseBreakdown } from "@/lib/payment-breakdown"

export async function GET(_req: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { appointmentId } = await params
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: session.user.id },
    include: {
      doctor: true,
      department: true,
      payments: true,
    },
  })
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let payment = appt.payments[0] ?? (await ensurePaymentForAppointment(appt.id))
  if (!payment) return NextResponse.json({ error: "No payment" }, { status: 404 })

  const breakdown = parseBreakdown(payment.breakdownJson)

  return NextResponse.json({
    payment: {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      breakdownJson: payment.breakdownJson,
      breakdown,
      invoiceUrl: payment.invoiceUrl,
      razorpayOrderId: payment.razorpayOrderId,
      paidAt: payment.paidAt?.toISOString() ?? null,
    },
    appointment: {
      id: appt.id,
      startsAt: appt.startsAt.toISOString(),
      tokenCode: appt.tokenCode,
      doctorName: appt.doctor.name,
      departmentName: appt.department.name,
    },
  })
}
