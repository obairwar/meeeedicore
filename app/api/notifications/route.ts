import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ limit: url.searchParams.get("limit") ?? undefined })
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

  const limit = parsed.data.limit ?? 10

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ])

  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  })
}
