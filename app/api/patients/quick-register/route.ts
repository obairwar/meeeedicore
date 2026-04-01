import { NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  age: z.number().int().min(0).max(120),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bloodGroup: z.string().min(1),
})

function randomTempPassword() {
  return `Temp@${Math.floor(100000 + Math.random() * 900000)}`
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const tempPassword = randomTempPassword()
  const passwordHash = await hash(tempPassword, 12)

  const dob = new Date()
  dob.setFullYear(dob.getFullYear() - parsed.data.age)

  const email = `walkin_${parsed.data.phone}@hospital.local`

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email,
      passwordHash,
      role: "PATIENT",
      dateOfBirth: dob,
      gender: parsed.data.gender,
      bloodGroup: parsed.data.bloodGroup,
      address: "Walk-in (reception)",
    },
  })

  // SMS will be wired with Twilio later
  console.log(`[TEMP PASSWORD SMS] to ${parsed.data.phone}: ${tempPassword}`)

  return NextResponse.json({ user: { id: user.id, name: user.name, phone: user.phone, email: user.email } })
}

