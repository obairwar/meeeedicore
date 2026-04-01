import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const doctor = await prisma.doctor.findUnique({
    where: { userId: session.user.id },
    include: { schedules: { take: 1 } },
  })

  if (!doctor) {
    return NextResponse.json({ success: false, error: "No doctor profile" }, { status: 404 })
  }

  const slotDurationMinutes = doctor.schedules[0]?.slotDurationMinutes ?? 15

  return NextResponse.json({
    success: true,
    data: {
      id: doctor.id,
      departmentId: doctor.departmentId,
      slotDurationMinutes,
      name: doctor.name,
    },
  })
}
