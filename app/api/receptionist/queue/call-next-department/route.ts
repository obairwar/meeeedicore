import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { runCallNext } from "@/lib/queue-call-next"

const bodySchema = z.object({ departmentId: z.string().min(1) })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "RECEPTIONIST") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 })

  const doctors = await prisma.doctor.findMany({
    where: { departmentId: parsed.data.departmentId },
    orderBy: { id: "asc" },
    select: { id: true },
  })

  let targetDoctorId: string | null = null
  for (const d of doctors) {
    const waiting = await prisma.queueEntry.count({
      where: { doctorId: d.id, status: "WAITING" },
    })
    if (waiting > 0) {
      targetDoctorId = d.id
      break
    }
  }

  if (!targetDoctorId) {
    return NextResponse.json({ success: false, error: "No waiting patients in this department" }, { status: 400 })
  }

  try {
    const { result, queueLength } = await runCallNext(targetDoctorId, "101")
    if (!result.nextCalled) {
      return NextResponse.json({ success: true, data: { message: "Queue empty", queueLength } })
    }
    return NextResponse.json({
      success: true,
      data: {
        calledToken: result.nextCalled.appointment.tokenCode,
        doctorId: targetDoctorId,
        queueLength,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
