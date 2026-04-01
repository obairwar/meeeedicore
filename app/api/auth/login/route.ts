import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { createTwoFactorTempToken } from "@/lib/two-factor"

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    })
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const ok = await compare(parsed.data.password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (user.twoFactorEnabled) {
      const tempToken = await createTwoFactorTempToken(user.id)
      return NextResponse.json({ needs2fa: true, tempToken })
    }

    return NextResponse.json({ needs2fa: false })
  } catch (e) {
    console.error("POST /api/auth/login:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
