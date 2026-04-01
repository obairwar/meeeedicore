import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateBackupCodesPlain, hashBackupCodes, verifyTotp } from "@/lib/two-factor"

const bodySchema = z.object({
  secret: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 })
  }

  if (!verifyTotp(parsed.data.secret, parsed.data.otp)) {
    return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 })
  }

  const plainCodes = generateBackupCodesPlain(10)
  const hashed = await hashBackupCodes(plainCodes)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: parsed.data.secret,
      twoFactorBackupCodes: JSON.stringify(hashed),
    },
  })

  return NextResponse.json({ backupCodes: plainCodes })
}
