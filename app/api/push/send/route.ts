import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { sendWebPushToUser } from "@/lib/push-web"

const bodySchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  tag: z.string().optional(),
  secret: z.string().optional(),
})

/**
 * Internal / admin push (e.g. cron). Protect with CRON_SECRET or PUSH_SEND_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.PUSH_SEND_SECRET ?? process.env.CRON_SECRET
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (secret && parsed.data.secret !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await sendWebPushToUser(parsed.data.userId, {
    title: parsed.data.title,
    body: parsed.data.body,
    tag: parsed.data.tag,
  })

  return NextResponse.json({ ok: true })
}
