import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const schema = z.object({
  appointmentId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  anonymous: z.boolean().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const appt = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, patientId: session.user.id },
    include: { doctor: true, feedback: true },
  })
  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  if (appt.status !== "COMPLETED") {
    return NextResponse.json({ error: "Feedback allowed after appointment is completed" }, { status: 400 })
  }
  if (appt.feedback) return NextResponse.json({ error: "Already submitted" }, { status: 409 })

  const { rating, comment, anonymous } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    const fb = await tx.feedback.create({
      data: {
        appointmentId: appt.id,
        patientId: session.user.id,
        doctorId: appt.doctorId,
        rating,
        comment: comment ?? null,
        anonymous: anonymous ?? false,
      },
    })

    const doctor = await tx.doctor.findUnique({ where: { id: appt.doctorId } })
    if (!doctor) throw new Error("Doctor missing")

    const n = doctor.ratingCount + 1
    const newAvg = (doctor.rating * doctor.ratingCount + rating) / n

    await tx.doctor.update({
      where: { id: appt.doctorId },
      data: { rating: newAvg, ratingCount: n },
    })

    return fb
  })

  return NextResponse.json({ ok: true, feedbackId: result.id })
}
