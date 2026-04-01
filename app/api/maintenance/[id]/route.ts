import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

const patchSchema = z.object({
  status: z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]).optional(),
  assigneeId: z.string().nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const existing = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: { reporter: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: {
    status?: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED"
    assigneeId?: string | null
  } = {}

  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.assigneeId !== undefined) {
    data.assigneeId = parsed.data.assigneeId
    if (parsed.data.assigneeId && parsed.data.status === undefined) {
      data.status = "ASSIGNED"
    }
    if (parsed.data.assigneeId === null && parsed.data.status === undefined) {
      data.status = "OPEN"
    }
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id },
    data,
  })

  const statusChanged =
    parsed.data.status !== undefined && parsed.data.status !== existing.status
  const assigneeChanged =
    parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== existing.assigneeId

  if (statusChanged || assigneeChanged) {
    const subject = `Maintenance request updated: ${existing.location}`
    const html = `
      <p>Your maintenance report was updated.</p>
      <p><strong>Location:</strong> ${escapeHtml(existing.location)}</p>
      <p><strong>Status:</strong> ${escapeHtml(updated.status)}</p>
      <p><strong>Issue:</strong> ${escapeHtml(existing.description)}</p>
    `
    try {
      await sendEmail(existing.reporter.email, subject, html)
    } catch (e) {
      console.error("[maintenance] email notify failed", e)
    }
  }

  return NextResponse.json({ ok: true })
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
