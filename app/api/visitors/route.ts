import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  patientId: z.string().min(1),
  relationship: z.string().min(2),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const today = url.searchParams.get("today") === "1"
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const rows = await prisma.visitor.findMany({
    where: today ? { checkedInAt: { gte: start, lte: end } } : undefined,
    orderBy: { checkedInAt: "desc" },
    include: { patient: true },
  })

  return NextResponse.json(
    rows.map((v) => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      relationship: v.relationship,
      patient: { id: v.patientId, name: v.patient.name },
      checkedInAt: v.checkedInAt,
      checkedOutAt: v.checkedOutAt,
    }))
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  // ICU limit: max 2 active visitors
  const icuBed = await prisma.bed.findFirst({
    where: { patientId: parsed.data.patientId, ward: "ICU", status: "OCCUPIED" },
  })
  if (icuBed) {
    const active = await prisma.visitor.count({
      where: { patientId: parsed.data.patientId, checkedOutAt: null },
    })
    if (active >= 2) {
      return NextResponse.json({ error: "ICU patients can have max 2 visitors at once." }, { status: 409 })
    }
  }

  const v = await prisma.visitor.create({
    data: parsed.data,
    include: { patient: true },
  })

  return NextResponse.json({
    id: v.id,
    name: v.name,
    phone: v.phone,
    relationship: v.relationship,
    patient: { id: v.patientId, name: v.patient.name },
    checkedInAt: v.checkedInAt,
    checkedOutAt: v.checkedOutAt,
  })
}

