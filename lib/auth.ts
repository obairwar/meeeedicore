import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { compare } from "bcryptjs"

import { prisma } from "@/lib/prisma"
import { verifyBackupCode, verifyTotp, verifyTwoFactorTempToken } from "@/lib/two-factor"
import { check2faRateLimit, clear2faAttempts, record2faFailure } from "@/lib/two-fa-rate-limit"

const passwordOnlySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const twoFactorSchema = z.object({
  twoFactorToken: z.string().min(1),
  otp: z.string().optional(),
  backupCode: z.string().optional(),
})

type AuthUser = {
  id: string
  role:
    | "PATIENT"
    | "DOCTOR"
    | "NURSE"
    | "RECEPTIONIST"
    | "PHARMACIST"
    | "LAB_TECHNICIAN"
    | "ADMIN"
}

function toAuthUser(user: {
  id: string
  name: string
  email: string
  role: AuthUser["role"]
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorToken: { label: "2FA token", type: "text" },
        otp: { label: "OTP", type: "text" },
        backupCode: { label: "Backup code", type: "text" },
      },
      async authorize(credentials) {
        const c = credentials as Record<string, string | undefined>

        if (c.twoFactorToken && (c.otp || c.backupCode)) {
          const parsed = twoFactorSchema.safeParse(c)
          if (!parsed.success) return null
          const payload = await verifyTwoFactorTempToken(parsed.data.twoFactorToken)
          if (!payload) return null

          const rateKey = `2fa:${payload.userId}`
          const limited = check2faRateLimit(rateKey)
          if (!limited.ok) return null

          const user = await prisma.user.findUnique({ where: { id: payload.userId } })
          if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) return null

          let valid = false
          if (parsed.data.otp && verifyTotp(user.twoFactorSecret, parsed.data.otp.trim())) {
            valid = true
          } else if (parsed.data.backupCode && user.twoFactorBackupCodes) {
            const v = await verifyBackupCode(user.twoFactorBackupCodes, parsed.data.backupCode)
            if (v.valid && v.nextJson !== null) {
              await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorBackupCodes: v.nextJson },
              })
              valid = true
            }
          }

          if (!valid) {
            record2faFailure(rateKey)
            return null
          }

          clear2faAttempts(rateKey)
          return toAuthUser(user)
        }

        const parsed = passwordOnlySchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        })
        if (!user) return null

        const ok = await compare(parsed.data.password, user.passwordHash)
        if (!ok) return null

        if (user.twoFactorEnabled) return null

        return toAuthUser(user)
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as AuthUser
        token.id = u.id
        token.role = u.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "")
        session.user.role = (token.role ?? "PATIENT") as AuthUser["role"]
      }
      return session
    },
  },
})
