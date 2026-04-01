import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  locale: z.enum(["en", "ur", "hi"]),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id },
    data: { preferredLanguage: parsed.data.locale },
  })

  return NextResponse.json({ ok: true, locale: parsed.data.locale })
}
