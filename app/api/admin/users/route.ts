import { NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import type { Role } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit"

const staffRoles: Role[] = [
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
  "LAB_TECHNICIAN",
  "ADMIN",
]

const postSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum([
    "PATIENT",
    "DOCTOR",
    "NURSE",
    "RECEPTIONIST",
    "PHARMACIST",
    "LAB_TECHNICIAN",
    "ADMIN",
  ]),
  password: z.string().min(8).optional(),
})

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role") as Role | "ALL" | null
  const q = (searchParams.get("q") ?? "").trim().toLowerCase()

  const where: Prisma.UserWhereInput = {}
  if (role && role !== "ALL") where.role = role as Role

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q)
      )
    : users

  return NextResponse.json({ users: filtered })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const password = parsed.data.password ?? `Temp${Math.random().toString(36).slice(2, 10)}!1`
  const passwordHash = await hash(password, 12)

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      role: parsed.data.role,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  await logAudit(admin.user.id, "USER_CREATE", `user:${created.id}`, { email: created.email }, req)

  return NextResponse.json({ user: created, temporaryPassword: parsed.data.password ? undefined : password })
}
