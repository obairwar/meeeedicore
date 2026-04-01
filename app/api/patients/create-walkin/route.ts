import { NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(8),
  bloodGroup: z.string().optional(),
})

function randomTempPassword() {
  return `Temp@${Math.floor(100000 + Math.random() * 900000)}`
}

function parseDob(s: string): Date | null {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const dob = parseDob(parsed.data.dateOfBirth)
  if (!dob) return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 })

  const tempPassword = randomTempPassword()
  const passwordHash = await hash(tempPassword, 12)
  const email = `walkin_${parsed.data.phone.replace(/\D/g, "")}@hospital.local`

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email,
      passwordHash,
      role: "PATIENT",
      dateOfBirth: dob,
      gender: parsed.data.gender,
      bloodGroup: parsed.data.bloodGroup?.trim() || undefined,
      address: "Walk-in (reception)",
      isWalkIn: true,
    },
  })

  console.log(`[TEMP PASSWORD SMS] to ${parsed.data.phone}: ${tempPassword}`)

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      bloodGroup: user.bloodGroup,
    },
  })
}
