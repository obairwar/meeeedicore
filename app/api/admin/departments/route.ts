import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit"
import { startOfDay } from "@/lib/analytics-range"

const postSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  floor: z.string().min(1),
  rooms: z.number().int().min(0).optional(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const depts = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      doctors: { select: { id: true, name: true, specialization: true } },
    },
  })

  const rows = await Promise.all(
    depts.map(async (d) => {
      const todayAppointments = await prisma.appointment.count({
        where: { departmentId: d.id, startsAt: { gte: today, lt: tomorrow } },
      })
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        floor: d.floor,
        rooms: d.rooms,
        doctorCount: d.doctors.length,
        doctors: d.doctors,
        todayAppointments,
      }
    })
  )

  return NextResponse.json({ departments: rows })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  try {
    const created = await prisma.department.create({
      data: {
        code: parsed.data.code.toUpperCase(),
        name: parsed.data.name,
        floor: parsed.data.floor,
        rooms: parsed.data.rooms ?? 0,
      },
    })
    await logAudit(admin.user.id, "DEPARTMENT_CREATE", `department:${created.id}`, { code: created.code }, req)
    return NextResponse.json({ department: created })
  } catch {
    return NextResponse.json({ error: "Code may already exist" }, { status: 400 })
  }
}
