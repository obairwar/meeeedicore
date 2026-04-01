import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export const runtime = "nodejs"

const bodySchema = z.object({
  medicineName: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
})

/**
 * Placeholder "AI" endpoint.
 * Returns in-stock inventory items as alternatives (same category when known).
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const medicineName = parsed.data.medicineName.trim()
  const limit = parsed.data.limit ?? 5

  const current = await prisma.inventoryItem.findUnique({ where: { name: medicineName } })
  const category = current?.category ?? null

  const candidates = await prisma.inventoryItem.findMany({
    where: {
      quantity: { gt: 0 },
      name: { not: medicineName },
      ...(category ? { category } : {}),
    },
    orderBy: [{ quantity: "desc" }, { name: "asc" }],
    take: limit,
  })

  // Fallback: if category filter returns nothing, broaden search.
  const items =
    candidates.length > 0
      ? candidates
      : await prisma.inventoryItem.findMany({
          where: { quantity: { gt: 0 }, name: { not: medicineName } },
          orderBy: [{ quantity: "desc" }, { name: "asc" }],
          take: limit,
        })

  return NextResponse.json({
    ok: true,
    medicineName,
    alternatives: items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
    })),
  })
}

