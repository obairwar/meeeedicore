import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const departmentId = url.searchParams.get("departmentId")
  const withQueueLength = url.searchParams.get("withQueueLength") === "1"

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const doctors = await prisma.doctor.findMany({
    where: departmentId ? { departmentId } : undefined,
    orderBy: { name: "asc" },
    include: { schedules: true, department: true },
  })

  const queueCounts = withQueueLength
    ? await Promise.all(
        doctors.map((d) =>
          prisma.queueEntry.count({
            where: {
              doctorId: d.id,
              appointment: { startsAt: { gte: todayStart, lt: todayEnd } },
              status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] },
            },
          })
        )
      )
    : null

  return NextResponse.json(
    doctors.map((d, i) => ({
      id: d.id,
      name: d.name,
      specialization: d.specialization,
      experienceYears: d.experienceYears,
      rating: d.rating,
      consultationFee: d.consultationFee,
      bio: d.bio,
      photoUrl: d.photoUrl,
      department: { id: d.departmentId, name: d.department.name, code: d.department.code },
      availableDays: d.schedules.map((s) => s.dayOfWeek),
      ...(withQueueLength && queueCounts ? { queueLengthToday: queueCounts[i] ?? 0 } : {}),
    }))
  )
}

