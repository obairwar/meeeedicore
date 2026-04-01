import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PATCH(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  await prisma.visitor.update({
    where: { id },
    data: { checkedOutAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}

