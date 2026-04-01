import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { NotificationService } from "@/lib/notification-service"

export const runtime = "nodejs"

/**
 * Call on a schedule (e.g. every 5–10 minutes) to remind patients whose appointment
 * starts in ~1 hour. Sends WhatsApp + SMS per Sprint 6.
 *
 * Security: set CRON_SECRET in production and call with:
 *   Authorization: Bearer <CRON_SECRET>
 * If CRON_SECRET is unset, only non-production runs are allowed.
 */
function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === "production" && !secret) return false
  if (!secret) return true
  const auth = req.headers.get("authorization")
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null
  return token === secret
}

export async function GET(req: Request) {
  return runReminders(req)
}

export async function POST(req: Request) {
  return runReminders(req)
}

async function runReminders(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const oneHourMs = 60 * 60 * 1000
  const windowMs = 5 * 60 * 1000
  const windowStart = new Date(now + oneHourMs - windowMs)
  const windowEnd = new Date(now + oneHourMs + windowMs)

  const appointments = await prisma.appointment.findMany({
    where: {
      hourReminderSentAt: null,
      status: { in: ["CONFIRMED", "PENDING"] },
      startsAt: { gte: windowStart, lte: windowEnd },
    },
    include: { doctor: true, department: true },
  })

  const notifier = new NotificationService()
  let sent = 0

  for (const appt of appointments) {
    const doctorName = appt.doctor?.name ?? "your doctor"
    const when = appt.startsAt.toLocaleString()
    await notifier.send(appt.patientId, {
      title: "Appointment in 1 hour",
      message: `Reminder: your appointment with ${doctorName} is in 1 hour (${when}). Token: ${appt.tokenCode}.`,
      channels: ["WHATSAPP", "SMS"],
      type: "INFO",
      data: { appointmentId: appt.id, tokenCode: appt.tokenCode, kind: "REMINDER_1H" },
    })

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { hourReminderSentAt: new Date() },
    })
    sent += 1
  }

  return NextResponse.json({ ok: true, checkedWindow: { from: windowStart.toISOString(), to: windowEnd.toISOString() }, sent })
}
