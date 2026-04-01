import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runCallNext } from "@/lib/queue-call-next"

export async function POST(_req: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { doctorId } = await context.params
  const myDoctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!myDoctor || myDoctor.id !== doctorId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { result, queueLength } = await runCallNext(doctorId, "204")

    if (!result.nextCalled) {
      return NextResponse.json({
        success: true,
        data: { message: "Queue is empty", nextToken: null, queueLength },
        error: null,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        calledToken: result.nextCalled.appointment.tokenCode,
        patientName: result.nextCalled.appointment.patient?.name,
        remainingInQueue: result.remaining.length,
        queueLength,
      },
      error: null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Call next failed"
    console.error("Call next error:", error)
    return NextResponse.json({ success: false, data: null, error: message }, { status: 500 })
  }
}

/** Backward compatibility with existing doctor dashboard */
export async function PATCH(req: NextRequest, context: { params: Promise<{ doctorId: string }> }) {
  return POST(req, context)
}
