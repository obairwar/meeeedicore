import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitToRoom } from "@/lib/socket-emit"
import twilio from "twilio"

const bodySchema = z.object({
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .nullable()
    .optional(),
})

async function sendEmergencyWhatsApp(phone: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER
  if (!sid || !token || !from) {
    console.log("[WHATSAPP MOCK emergency contact]", phone, message)
    return
  }
  const client = twilio(sid, token)
  await client.messages.create({ from, to: `whatsapp:${phone}`, body: message })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const patient = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  }

  const doctor = await prisma.doctor.findFirst({
    orderBy: { id: "asc" },
  })
  if (!doctor) {
    return NextResponse.json({ error: "No doctor available" }, { status: 503 })
  }

  const now = new Date()
  const endsAt = new Date(now.getTime() + 30 * 60 * 1000)
  const tokenCode = `EM-${randomBytes(6).toString("hex").toUpperCase()}`

  const last = await prisma.queueEntry.findFirst({
    where: { doctorId: doctor.id },
    orderBy: { position: "desc" },
  })
  const position = (last?.position ?? 0) + 1

  const appt = await prisma.appointment.create({
    data: {
      tokenCode,
      status: "CONFIRMED",
      priority: "EMERGENCY",
      patientId: patient.id,
      departmentId: doctor.departmentId,
      doctorId: doctor.id,
      startsAt: now,
      endsAt,
      symptoms: "Emergency SOS",
      consultationFee: doctor.consultationFee,
      consultationType: "IN_PERSON",
    },
  })

  await prisma.queueEntry.create({
    data: {
      appointmentId: appt.id,
      doctorId: doctor.id,
      position,
      status: "WAITING",
      estimatedWaitMinutes: 0,
    },
  })

  const payload = {
    patientId: patient.id,
    patientName: patient.name,
    location: parsed.data.location ?? null,
    timestamp: now.toISOString(),
    appointmentId: appt.id,
  }

  await emitToRoom("staff-emergency", "emergency:alert", payload)

  const emergencyPhone = patient.emergencyContactPhone
  if (emergencyPhone) {
    const msg = `EMERGENCY: ${patient.name} triggered SOS. The hospital has been notified. Time: ${now.toLocaleString()}`
    try {
      await sendEmergencyWhatsApp(emergencyPhone, msg)
    } catch (e) {
      console.error("[emergency/sos] WhatsApp failed", e)
    }
  }

  return NextResponse.json({ appointmentId: appt.id })
}
