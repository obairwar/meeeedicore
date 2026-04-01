import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { appointment: true },
  })
  if (!payment?.invoiceUrl) return NextResponse.json({ error: "Invoice not available" }, { status: 404 })

  const role = session.user.role
  const isPatient = payment.appointment.patientId === session.user.id
  const isStaff = role === "ADMIN" || role === "RECEPTIONIST"
  if (!isPatient && !isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.redirect(payment.invoiceUrl)
}
