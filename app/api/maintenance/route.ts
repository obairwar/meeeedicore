import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const STAFF = ["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "PHARMACIST", "LAB_TECHNICIAN"] as const

const postSchema = z.object({
  location: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "EMERGENCY"]),
  photoUrl: z.string().url().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const items = await prisma.maintenanceRequest.findMany({
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const assignees = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] },
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ items, assignees })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!STAFF.includes(session.user.role as (typeof STAFF)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const row = await prisma.maintenanceRequest.create({
    data: {
      reporterId: session.user.id,
      location: parsed.data.location,
      description: parsed.data.description,
      priority: parsed.data.priority,
      photoUrl: parsed.data.photoUrl ?? null,
    },
  })

  return NextResponse.json({ id: row.id })
}
