import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const paid = await prisma.payment.findMany({
    where: { status: "PAID", paidAt: { not: null } },
    select: { amount: true, paidAt: true },
  })

  const now = new Date()
  const byMonth = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    byMonth.set(key, 0)
  }

  for (const p of paid) {
    if (!p.paidAt) continue
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount)
  }

  const months = Array.from(byMonth.entries()).map(([month, revenue]) => ({ month, revenue }))

  const financial = months.map((m) => ({
    month: m.month,
    revenue: m.revenue,
    expenses: 0,
    net: m.revenue,
  }))

  return NextResponse.json({ monthly: months, financial })
}
