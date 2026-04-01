import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit"

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  floor: z.string().min(1).optional(),
  rooms: z.number().int().min(0).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.floor !== undefined) data.floor = parsed.data.floor
  if (parsed.data.rooms !== undefined) data.rooms = parsed.data.rooms
  if (parsed.data.code !== undefined) data.code = parsed.data.code.toUpperCase()

  const updated = await prisma.department.update({
    where: { id },
    data: data as { name?: string; code?: string; floor?: string; rooms?: number },
  })

  await logAudit(admin.user.id, "DEPARTMENT_UPDATE", `department:${id}`, parsed.data as Record<string, unknown>, req)

  return NextResponse.json({ department: updated })
}
