import { NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"

import { prisma } from "@/lib/prisma"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  dateOfBirth: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bloodGroup: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(5),
  emergencyContactName: z.string().min(2),
  emergencyContactPhone: z.string().min(10),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const passwordHash = await hash(parsed.data.password, 12)

  const fullAddress = `${parsed.data.address.trim()}\nCity: ${parsed.data.city.trim()}`

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone,
      passwordHash,
      role: "PATIENT",
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      gender: parsed.data.gender,
      bloodGroup: parsed.data.bloodGroup,
      address: fullAddress,
      emergencyContactName: parsed.data.emergencyContactName,
      emergencyContactPhone: parsed.data.emergencyContactPhone,
    },
  })

  return NextResponse.json({ ok: true })
}

