import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { emitToRoom } from "@/lib/socket-emit"

const schema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional(),
  patientId: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const updated = await prisma.bed.update({
    where: { id },
    data: {
      status: parsed.data.status,
      patientId: parsed.data.patientId === undefined ? undefined : parsed.data.patientId,
      notes: parsed.data.notes,
      admittedAt:
        parsed.data.status === "OCCUPIED"
          ? new Date()
          : parsed.data.status === "AVAILABLE"
            ? null
            : undefined,
    },
    include: { patient: true },
  })

  await emitToRoom("beds", "bed:status_changed", {
    bedId: updated.id,
    ward: updated.ward,
    bedNumber: updated.bedNumber,
    status: updated.status,
    patient: updated.patient ? { id: updated.patient.id, name: updated.patient.name } : null,
    admittedAt: updated.admittedAt,
  })

  return NextResponse.json({ ok: true })
}

