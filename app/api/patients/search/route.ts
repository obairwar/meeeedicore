import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const schema = z.object({
  q: z.string().min(1),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const parsed = schema.safeParse({ q: url.searchParams.get("q") })
  if (!parsed.success) return NextResponse.json({ error: "Missing q" }, { status: 400 })

  const q = parsed.data.q.trim()

  const users = await prisma.user.findMany({
    where: {
      role: "PATIENT",
      OR: [
        { phone: { contains: q } },
        { name: { contains: q } },
        { email: { contains: q } },
      ],
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      dateOfBirth: u.dateOfBirth,
      gender: u.gender,
      bloodGroup: u.bloodGroup,
    }))
  )
}

