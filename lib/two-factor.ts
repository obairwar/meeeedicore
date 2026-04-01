import { compare, hash } from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { generateSecret, verifySync } from "otplib"

const TWO_FACTOR_JWT_ALG = "HS256" as const

function getJwtSecret() {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error("NEXTAUTH_SECRET is not set")
  return new TextEncoder().encode(s)
}

export function generateTotpSecret() {
  return generateSecret()
}

export function verifyTotp(secret: string, token: string) {
  return verifySync({ secret, token }).valid
}

export function generateBackupCodesPlain(count = 10) {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const part = Math.random().toString(36).slice(2, 10).toUpperCase()
    codes.push(`${part.slice(0, 4)}-${part.slice(4, 8)}`)
  }
  return codes
}

export async function hashBackupCodes(codes: string[]) {
  return Promise.all(codes.map((c) => hash(c, 10)))
}

export async function verifyBackupCode(codesJson: string | null, code: string) {
  if (!codesJson) return { valid: false as const, nextJson: null as string | null }
  const codes: string[] = JSON.parse(codesJson)
  const normalized = code.trim().replace(/\s+/g, "-").toUpperCase()
  for (let i = 0; i < codes.length; i++) {
    if (await compare(normalized, codes[i])) {
      const next = [...codes]
      next.splice(i, 1)
      return { valid: true as const, nextJson: JSON.stringify(next) }
    }
  }
  return { valid: false as const, nextJson: null as string | null }
}

export async function createTwoFactorTempToken(userId: string) {
  return new SignJWT({ sub: userId, typ: "2fa-pending" })
    .setProtectedHeader({ alg: TWO_FACTOR_JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getJwtSecret())
}

export async function verifyTwoFactorTempToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: [TWO_FACTOR_JWT_ALG] })
    if (payload.typ !== "2fa-pending" || typeof payload.sub !== "string") return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}
