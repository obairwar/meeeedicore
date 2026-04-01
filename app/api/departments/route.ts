import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const depts = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { doctors: true } } },
  })
  return NextResponse.json(
    depts.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      floor: d.floor,
      doctorsCount: d._count.doctors,
    }))
  )
}

