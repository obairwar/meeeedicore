import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ensurePaymentForAppointment } from "@/lib/ensure-payment"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: session.user.id },
    orderBy: { startsAt: "desc" },
    include: {
      doctor: true,
      department: true,
      payments: true,
    },
  })

  const rows = []
  for (const a of appointments) {
    let p = a.payments[0]
    if (!p) {
      const ensured = await ensurePaymentForAppointment(a.id)
      if (!ensured) continue
      p = ensured
    }
    rows.push({
      paymentId: p.id,
      appointmentId: a.id,
      startsAt: a.startsAt.toISOString(),
      doctorName: a.doctor.name,
      departmentName: a.department.name,
      amount: p.amount,
      status: p.status,
      tokenCode: a.tokenCode,
    })
  }

  return NextResponse.json(rows)
}
