import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const querySchema = z.object({
  status: z.enum(["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined })
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

  const orders = await prisma.labOrder.findMany({
    where: parsed.data.status ? { status: parsed.data.status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      medicalRecord: {
        include: {
          patient: true,
          doctor: true,
          appointment: true,
        },
      },
    },
  })

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      testName: o.testName,
      status: o.status,
      resultUrl: o.resultUrl,
      notes: o.notes,
      completedAt: o.completedAt,
      orderedAt: o.createdAt,
      patient: o.medicalRecord.patient ? { id: o.medicalRecord.patient.id, name: o.medicalRecord.patient.name } : null,
      doctor: o.medicalRecord.doctor ? { id: o.medicalRecord.doctor.id, name: o.medicalRecord.doctor.name } : null,
      appointmentId: o.medicalRecord.appointmentId ?? null,
    }))
  )
}

