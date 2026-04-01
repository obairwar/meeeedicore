import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const action = searchParams.get("action")
  const resource = searchParams.get("resource")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 500)

  const where: {
    userId?: string
    action?: string
    resource?: { contains: string }
    createdAt?: { gte?: Date; lte?: Date }
  } = {}
  if (userId) where.userId = userId
  if (action) where.action = action
  if (resource) where.resource = { contains: resource }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  })

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recent = await prisma.auditLog.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: oneHourAgo },
      userId: { not: null },
    },
    _count: { id: true },
  })

  const suspicious = recent.filter((r) => r._count.id > 50 && r.userId)

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      timestamp: l.createdAt.toISOString(),
      userId: l.userId,
      userName: l.user?.name ?? "—",
      userEmail: l.user?.email ?? "—",
      action: l.action,
      resource: l.resource,
      details: l.detailsJson ? JSON.parse(l.detailsJson) : null,
      ipAddress: l.ipAddress,
    })),
    suspicious: suspicious.map((s) => ({
      userId: s.userId,
      accessesInHour: s._count.id,
    })),
  })
}
