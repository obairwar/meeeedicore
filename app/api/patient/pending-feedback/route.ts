import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const WINDOW_MS = 24 * 60 * 60 * 1000

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const since = new Date(Date.now() - WINDOW_MS)

  const appointment = await prisma.appointment.findFirst({
    where: {
      patientId: session.user.id,
      status: "COMPLETED",
      updatedAt: { gte: since },
      feedback: { is: null },
    },
    orderBy: { updatedAt: "desc" },
    include: { doctor: true },
  })

  if (!appointment) return NextResponse.json({ prompt: null })

  return NextResponse.json({
    prompt: {
      appointmentId: appointment.id,
      doctorName: appointment.doctor.name,
      doctorPhotoUrl: appointment.doctor.photoUrl,
      completedAt: appointment.updatedAt.toISOString(),
    },
  })
}
