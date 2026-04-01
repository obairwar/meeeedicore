import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ref = searchParams.get("month") ? new Date(searchParams.get("month")!) : new Date()
  if (Number.isNaN(ref.getTime())) return NextResponse.json({ error: "Invalid month" }, { status: 400 })

  const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)

  const doctors = await prisma.doctor.findMany({
    include: {
      department: true,
      appointments: {
        where: { startsAt: { gte: start, lte: end } },
        include: {
          payments: { where: { status: "PAID" } },
          queueEntry: { select: { startedAt: true, completedAt: true } },
        },
      },
    },
  })

  const rows = doctors.map((d) => {
    let revenue = 0
    let consultMins: number[] = []
    let patients = d.appointments.length

    for (const a of d.appointments) {
      for (const p of a.payments) revenue += p.amount
      const q = a.queueEntry
      if (q?.startedAt && q?.completedAt) {
        consultMins.push(Math.max(0, (q.completedAt.getTime() - q.startedAt.getTime()) / 60000))
      }
    }

    const avgConsult =
      consultMins.length > 0 ? consultMins.reduce((x, y) => x + y, 0) / consultMins.length : 0

    return {
      id: d.id,
      name: d.name,
      departmentName: d.department.name,
      patientsThisMonth: patients,
      rating: d.rating,
      ratingCount: d.ratingCount,
      avgConsultMinutes: Math.round(avgConsult * 10) / 10,
      revenue,
    }
  })

  return NextResponse.json({ doctors: rows, month: start.toISOString().slice(0, 7) })
}
