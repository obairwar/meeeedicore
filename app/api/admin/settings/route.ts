import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { logAudit } from "@/lib/audit"
import { defaultSystemSettings, mergeSettings, type SystemSettingsData } from "@/lib/system-settings-defaults"

const patchSchema = z.object({
  hospitalName: z.string().optional(),
  hospitalLogoUrl: z.string().optional(),
  hospitalAddress: z.string().optional(),
  hospitalPhone: z.string().optional(),
  hospitalEmail: z.string().optional(),
  tokenResetHour: z.number().int().min(0).max(23).optional(),
  notifyGlobalEmail: z.boolean().optional(),
  notifyGlobalSms: z.boolean().optional(),
  notifyGlobalWhatsapp: z.boolean().optional(),
  defaultSlotMinutes: z.number().int().min(5).max(120).optional(),
  maxPatientsPerDoctor: z.number().int().min(1).max(500).optional(),
})

async function getOrCreateSettings(): Promise<SystemSettingsData> {
  const row = await prisma.systemSettings.findUnique({ where: { id: "default" } })
  if (!row) {
    const data = defaultSystemSettings()
    await prisma.systemSettings.create({ data: { id: "default", dataJson: JSON.stringify(data) } })
    return data
  }
  return mergeSettings(row.dataJson)
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await getOrCreateSettings()
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const current = await getOrCreateSettings()
  const next: SystemSettingsData = { ...current, ...parsed.data }
  await prisma.systemSettings.upsert({
    where: { id: "default" },
    create: { id: "default", dataJson: JSON.stringify(next) },
    update: { dataJson: JSON.stringify(next) },
  })

  await logAudit(admin.user.id, "SETTINGS_UPDATE", "system:settings", parsed.data as Record<string, unknown>, req)

  return NextResponse.json(next)
}
