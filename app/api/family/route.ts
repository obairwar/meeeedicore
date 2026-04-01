import { NextResponse } from "next/server"
import { z } from "zod"
import { Gender } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { calculateAge } from "@/lib/utils"

const postSchema = z.object({
  name: z.string().min(1),
  relation: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  bloodGroup: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const members = await prisma.familyMember.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      relation: m.relation,
      dateOfBirth: m.dateOfBirth?.toISOString() ?? null,
      age: m.dateOfBirth ? calculateAge(m.dateOfBirth) : null,
      gender: m.gender,
      bloodGroup: m.bloodGroup,
    })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const dob = parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined
  if (dob && Number.isNaN(dob.getTime())) return NextResponse.json({ error: "Invalid dateOfBirth" }, { status: 400 })

  const created = await prisma.familyMember.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      relation: parsed.data.relation,
      dateOfBirth: dob,
      gender: parsed.data.gender,
      bloodGroup: parsed.data.bloodGroup,
    },
  })

  return NextResponse.json({
    member: {
      id: created.id,
      name: created.name,
      relation: created.relation,
      dateOfBirth: created.dateOfBirth?.toISOString() ?? null,
      age: created.dateOfBirth ? calculateAge(created.dateOfBirth) : null,
      gender: created.gender,
      bloodGroup: created.bloodGroup,
    },
  })
}
