import { NextResponse } from "next/server"
import QRCode from "qrcode"

import { auth } from "@/lib/auth"
import { generateTotpSecret } from "@/lib/two-factor"

const appName = "Smart Hospital"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const secret = generateTotpSecret()
  const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(session.user.email ?? "")}?secret=${secret}&issuer=${encodeURIComponent(appName)}`

  const qrDataUrl = await QRCode.toDataURL(otpauth)

  return NextResponse.json({
    secret,
    qrDataUrl,
    manualKey: secret,
  })
}
