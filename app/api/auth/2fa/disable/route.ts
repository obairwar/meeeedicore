import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  password: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const ok = await compare(parsed.data.password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  })

  return NextResponse.json({ ok: true })
}
