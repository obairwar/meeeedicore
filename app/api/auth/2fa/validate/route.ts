import { NextResponse } from "next/server"
import { z } from "zod"

import { signIn } from "@/lib/auth"
import { check2faRateLimit } from "@/lib/two-fa-rate-limit"
import { verifyTwoFactorTempToken } from "@/lib/two-factor"

const bodySchema = z.object({
  tempToken: z.string().min(1),
  otp: z.string().optional(),
  backupCode: z.string().optional(),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  if (!parsed.data.otp && !parsed.data.backupCode) {
    return NextResponse.json({ error: "Enter a code" }, { status: 400 })
  }

  const payload = await verifyTwoFactorTempToken(parsed.data.tempToken)
  if (!payload) {
    return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 })
  }

  const rateKey = `2fa:${payload.userId}`
  const limited = check2faRateLimit(rateKey)
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later.", lockedUntil: limited.lockedUntil },
      { status: 429 }
    )
  }

  const url = await signIn("credentials", {
    redirect: false,
    twoFactorToken: parsed.data.tempToken,
    otp: parsed.data.otp?.trim(),
    backupCode: parsed.data.backupCode?.trim(),
  })

  if (typeof url === "string" && (url.includes("error=") || url.includes("/login"))) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
