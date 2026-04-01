import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const beds = await prisma.bed.findMany({
    orderBy: [{ ward: "asc" }, { bedNumber: "asc" }],
    include: { patient: true },
  })

  return NextResponse.json(
    beds.map((b) => ({
      id: b.id,
      ward: b.ward,
      bedNumber: b.bedNumber,
      status: b.status,
      patient: b.patient ? { id: b.patient.id, name: b.patient.name, phone: b.patient.phone } : null,
      admittedAt: b.admittedAt,
      notes: b.notes,
    }))
  )
}

