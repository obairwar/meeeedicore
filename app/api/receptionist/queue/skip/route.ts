import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { skipAppointment } from "@/lib/receptionist-queue-actions"

const bodySchema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "RECEPTIONIST") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 })

  try {
    await skipAppointment(parsed.data.appointmentId)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
