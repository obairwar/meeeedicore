import { NextResponse } from "next/server"
import { z } from "zod"
import { hash, compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  preferredLanguage: z.string().nullable().optional(),
  notifyWhatsApp: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  deleteAccount: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const u = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    address: u.address,
    dateOfBirth: u.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    gender: u.gender,
    bloodGroup: u.bloodGroup,
    photoUrl: u.photoUrl,
    emergencyContactName: u.emergencyContactName,
    emergencyContactPhone: u.emergencyContactPhone,
    preferredLanguage: u.preferredLanguage,
    notifyWhatsApp: u.notifyWhatsApp,
    notifySms: u.notifySms,
    notifyEmail: u.notifyEmail,
    isActive: u.isActive,
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (parsed.data.deleteAccount) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    })
    return NextResponse.json({ ok: true, deactivated: true })
  }

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: "currentPassword required" }, { status: 400 })
    }
    const ok = await compare(parsed.data.currentPassword, user.passwordHash)
    if (!ok) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 })
    const passwordHash = await hash(parsed.data.newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  }

  const data: Record<string, unknown> = {}
  const p = parsed.data
  if (p.name !== undefined) data.name = p.name
  if (p.phone !== undefined) data.phone = p.phone
  if (p.address !== undefined) data.address = p.address
  if (p.gender !== undefined) data.gender = p.gender
  if (p.bloodGroup !== undefined) data.bloodGroup = p.bloodGroup
  if (p.emergencyContactName !== undefined) data.emergencyContactName = p.emergencyContactName
  if (p.emergencyContactPhone !== undefined) data.emergencyContactPhone = p.emergencyContactPhone
  if (p.preferredLanguage !== undefined) data.preferredLanguage = p.preferredLanguage
  if (p.notifyWhatsApp !== undefined) data.notifyWhatsApp = p.notifyWhatsApp
  if (p.notifySms !== undefined) data.notifySms = p.notifySms
  if (p.notifyEmail !== undefined) data.notifyEmail = p.notifyEmail
  if (p.photoUrl !== undefined) data.photoUrl = p.photoUrl
  if (p.dateOfBirth !== undefined) {
    if (p.dateOfBirth === null) data.dateOfBirth = null
    else {
      const d = new Date(p.dateOfBirth)
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid dateOfBirth" }, { status: 400 })
      data.dateOfBirth = d
    }
  }

  if (Object.keys(data).length) {
    await prisma.user.update({ where: { id: user.id }, data })
  }

  return NextResponse.json({ ok: true })
}
