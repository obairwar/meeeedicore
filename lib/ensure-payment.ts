import { prisma } from "@/lib/prisma"
import { computeBill, defaultLabItems } from "@/lib/payment-breakdown"

/** Creates a pending Payment row if the appointment has none (legacy appointments). */
export async function ensurePaymentForAppointment(appointmentId: string) {
  const existing = await prisma.payment.findFirst({ where: { appointmentId } })
  if (existing) return existing

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true },
  })
  if (!appt) return null

  const bill = computeBill(appt.consultationFee, defaultLabItems(), 0.05)
  return prisma.payment.create({
    data: {
      appointmentId,
      amount: bill.total,
      breakdownJson: JSON.stringify(bill),
      status: "PENDING",
    },
  })
}
