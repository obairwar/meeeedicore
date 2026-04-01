import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, context: { params: Promise<{ appointmentId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { appointmentId } = await context.params

  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { name: true } },
      doctor: { select: { name: true } },
      department: true,
      queueEntry: true,
    },
  })

  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const room = `${a.department.floor}01`

  return NextResponse.json({
    appointment: {
      id: a.id,
      tokenCode: a.tokenCode,
      status: a.status,
      priority: a.priority,
      startsAt: a.startsAt.toISOString(),
      patientName: a.patient.name,
      doctorName: a.doctor.name,
      departmentName: a.department.name,
      room,
      queuePosition: a.queueEntry?.position ?? 0,
      estimatedWaitMinutes: a.queueEntry?.estimatedWaitMinutes ?? 0,
    },
  })
}
