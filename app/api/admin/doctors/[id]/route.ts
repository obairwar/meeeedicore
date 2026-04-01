import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit"

const patchSchema = z.object({
  departmentId: z.string().min(1),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const dept = await prisma.department.findUnique({ where: { id: parsed.data.departmentId } })
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 })

  const updated = await prisma.doctor.update({
    where: { id },
    data: { departmentId: parsed.data.departmentId },
    include: { department: true },
  })

  await logAudit(
    admin.user.id,
    "DOCTOR_DEPARTMENT_CHANGE",
    `doctor:${id}`,
    { departmentId: parsed.data.departmentId },
    req
  )

  return NextResponse.json({ doctor: updated })
}
