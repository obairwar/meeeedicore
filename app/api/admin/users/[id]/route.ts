import { NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import type { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit"

const patchSchema = z.object({
  role: z
    .enum(["PATIENT", "DOCTOR", "NURSE", "RECEPTIONIST", "PHARMACIST", "LAB_TECHNICIAN", "ADMIN"])
    .optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: { doctorProfile: { include: { department: true } } },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    address: user.address,
    doctorProfile: user.doctorProfile
      ? {
          id: user.doctorProfile.id,
          department: user.doctorProfile.department.name,
          specialization: user.doctorProfile.specialization,
        }
      : null,
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  if (id === admin.user.id && parsed.data.isActive === false) {
    return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const data: { role?: Role; isActive?: boolean; passwordHash?: string } = {}
  if (parsed.data.role !== undefined) data.role = parsed.data.role
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive

  let newPassword: string | undefined
  if (parsed.data.resetPassword) {
    newPassword = `Reset${Math.random().toString(36).slice(2, 10)}!9`
    data.passwordHash = await hash(newPassword, 12)
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })

  await logAudit(admin.user.id, "USER_UPDATE", `user:${id}`, { changes: parsed.data }, req)

  return NextResponse.json({ user: updated, newPassword })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (id === admin.user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })

  await prisma.user.update({ where: { id }, data: { isActive: false } })
  await logAudit(admin.user.id, "USER_DEACTIVATE", `user:${id}`, {}, _req)

  return NextResponse.json({ ok: true })
}
