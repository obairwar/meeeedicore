import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { appointmentId } = await params
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: session.user.id },
    include: { doctor: true },
  })
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    appointment: {
      id: appt.id,
      status: appt.status,
      doctor: { name: appt.doctor.name, photoUrl: appt.doctor.photoUrl },
    },
  })
}
