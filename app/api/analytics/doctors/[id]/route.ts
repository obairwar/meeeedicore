import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      department: true,
      feedbacks: { orderBy: { createdAt: "desc" }, take: 50, include: { patient: { select: { name: true } } } },
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 200,
        include: {
          payments: { where: { status: "PAID" } },
          queueEntry: { select: { startedAt: true, completedAt: true, status: true } },
        },
      },
    },
  })
  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let revenue = 0
  const consultMins: number[] = []
  let completed = 0
  for (const a of doctor.appointments) {
    for (const p of a.payments) revenue += p.amount
    if (a.status === "COMPLETED") completed += 1
    const q = a.queueEntry
    if (q?.startedAt && q?.completedAt) {
      consultMins.push(Math.max(0, (q.completedAt.getTime() - q.startedAt.getTime()) / 60000))
    }
  }

  const total = doctor.appointments.length || 1
  const completionRate = Math.round((completed / total) * 1000) / 10
  const avgConsult =
    consultMins.length > 0 ? consultMins.reduce((a, b) => a + b, 0) / consultMins.length : 0

  const ratings = doctor.feedbacks.map((f) => f.rating)
  const ratingTrend = doctor.feedbacks.slice(0, 12).map((f) => ({
    date: f.createdAt.toISOString().slice(0, 10),
    rating: f.rating,
  }))

  return NextResponse.json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      department: doctor.department,
      rating: doctor.rating,
      ratingCount: doctor.ratingCount,
    },
    stats: {
      revenue,
      avgConsultMinutes: Math.round(avgConsult * 10) / 10,
      completionRate,
      completionCount: completed,
      appointmentCount: total,
    },
    ratingTrend,
    calendar: doctor.appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      status: a.status,
      tokenCode: a.tokenCode,
    })),
    feedback: doctor.feedbacks.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      anonymous: f.anonymous,
      patientName: f.anonymous ? "Anonymous" : f.patient.name,
      createdAt: f.createdAt.toISOString(),
      lowRating: f.rating <= 2,
    })),
  })
}
