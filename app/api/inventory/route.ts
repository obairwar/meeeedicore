import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notification-service"

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  unit: z.string().min(1).optional(),
  minThreshold: z.number().int().min(0).optional(),
  expiry: z.string().datetime().optional().nullable(),
  supplier: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.inventoryItem.findMany({ orderBy: [{ name: "asc" }] })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const item = await prisma.inventoryItem.create({
    data: {
      name: parsed.data.name.trim(),
      category: parsed.data.category?.trim() || null,
      quantity: parsed.data.quantity ?? 0,
      unit: parsed.data.unit?.trim() || "unit",
      minThreshold: parsed.data.minThreshold ?? 0,
      expiry: parsed.data.expiry ? new Date(parsed.data.expiry) : null,
      supplier: parsed.data.supplier?.trim() || null,
    },
  })

  if (item.quantity <= item.minThreshold) {
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

