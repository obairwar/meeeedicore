import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ success: false, error: "No doctor profile" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  if (!fromStr || !toStr) {
    return NextResponse.json({ success: false, error: "from and to (ISO dates) required" }, { status: 400 })
  }

  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ success: false, error: "Invalid dates" }, { status: 400 })
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      startsAt: { gte: from, lte: to },
    },
    orderBy: { startsAt: "asc" },
    include: {
      patient: { select: { name: true } },
      department: { select: { name: true } },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      appointments: appointments.map((a) => ({
        id: a.id,
        tokenCode: a.tokenCode,
        status: a.status,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        timeSlot: a.startsAt.toTimeString().slice(0, 5),
        patientName: a.patient.name,
        departmentName: a.department.name,
        symptoms: a.symptoms,
      })),
    },
  })
}
