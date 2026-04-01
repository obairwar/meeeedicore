import { NextResponse } from "next/server"
import { z } from "zod"
import { Gender } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { calculateAge } from "@/lib/utils"

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  relation: z.string().min(1).optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.nativeEnum(Gender).nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.familyMember.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.relation !== undefined) data.relation = parsed.data.relation
  if (parsed.data.gender !== undefined) data.gender = parsed.data.gender
  if (parsed.data.bloodGroup !== undefined) data.bloodGroup = parsed.data.bloodGroup
  if (parsed.data.dateOfBirth !== undefined) {
    if (parsed.data.dateOfBirth === null) data.dateOfBirth = null
    else {
      const d = new Date(parsed.data.dateOfBirth)
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid dateOfBirth" }, { status: 400 })
      data.dateOfBirth = d
    }
  }

  const updated = await prisma.familyMember.update({ where: { id }, data })

  return NextResponse.json({
    member: {
      id: updated.id,
      name: updated.name,
      relation: updated.relation,
      dateOfBirth: updated.dateOfBirth?.toISOString() ?? null,
      age: updated.dateOfBirth ? calculateAge(updated.dateOfBirth) : null,
      gender: updated.gender,
      bloodGroup: updated.bloodGroup,
    },
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.familyMember.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.familyMember.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
