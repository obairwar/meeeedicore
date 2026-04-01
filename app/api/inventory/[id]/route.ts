import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notification-service"

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: z.string().nullable().optional(),
    unit: z.string().min(1).optional(),
    minThreshold: z.number().int().min(0).optional(),
    expiry: z.string().datetime().nullable().optional(),
    supplier: z.string().nullable().optional(),
    quantity: z.number().int().min(0).optional(),
    adjustBy: z.number().int().optional(),
  })
  .refine((v) => !(v.quantity != null && v.adjustBy != null), { message: "Use either quantity or adjustBy" })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const existing = await prisma.inventoryItem.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const nextQuantity =
    parsed.data.quantity != null
      ? parsed.data.quantity
      : parsed.data.adjustBy != null
        ? Math.max(0, existing.quantity + parsed.data.adjustBy)
        : undefined

  const nextMinThreshold =
    parsed.data.minThreshold != null ? parsed.data.minThreshold : existing.minThreshold

  const prevLow = existing.quantity <= existing.minThreshold
  const nextLow =
    (nextQuantity != null ? nextQuantity : existing.quantity) <= nextMinThreshold

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim(),
      category: parsed.data.category === undefined ? undefined : parsed.data.category?.trim() || null,
      unit: parsed.data.unit?.trim(),
      minThreshold: parsed.data.minThreshold,
      expiry: parsed.data.expiry === undefined ? undefined : parsed.data.expiry ? new Date(parsed.data.expiry) : null,
      supplier: parsed.data.supplier === undefined ? undefined : parsed.data.supplier?.trim() || null,
      quantity: nextQuantity,
    },
  })

  if (!prevLow && nextLow) {
    const recipients = await prisma.user.findMany({
      where: { role: { in: ["PHARMACIST", "ADMIN"] } },
      select: { id: true },
    })
    const notifier = new NotificationService()
    await Promise.all(
      recipients.map((u) =>
        notifier.send(u.id, {
          title: "Low inventory alert",
          message: `${item.name} is low: ${item.quantity} ${item.unit} (min ${item.minThreshold}).`,
          channels: ["EMAIL", "IN_APP"],
          type: "WARNING",
          data: { inventoryItemId: item.id, name: item.name, quantity: item.quantity, minThreshold: item.minThreshold },
        })
      )
    )
  }

  return NextResponse.json({ ok: true, item })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.inventoryItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

