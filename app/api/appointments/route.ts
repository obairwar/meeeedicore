import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { generateTokenCode } from "@/lib/utils"
import { QueueService } from "@/lib/queue-service"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notification-service"
import { emitToRoom } from "@/lib/socket-emit"
import { computeBill, defaultLabItems } from "@/lib/payment-breakdown"

const schema = z
  .object({
  doctorId: z.string().min(1),
  departmentId: z.string().min(1),
  /** Prefer this for walk-in / client clock — avoids mixing UTC date with local time. */
  startsAt: z.string().min(1).optional(),
  date: z.string().optional(), // YYYY-MM-DD (with time, if startsAt omitted)
  time: z.string().optional(), // HH:mm
  symptoms: z.string().min(5),
  notes: z.string().optional(),
  familyMemberId: z.string().optional(),
  patientId: z.string().optional(),
  isWalkIn: z.boolean().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "EMERGENCY"]).optional(),
  triage: z
    .object({
      score: z.number().int().min(1).max(5),
      bpSystolic: z.number().int().optional(),
      bpDiastolic: z.number().int().optional(),
      pulse: z.number().int().optional(),
      temperature: z.number().optional(),
      spo2: z.number().int().optional(),
      painLevel: z.number().int().min(1).max(10).optional(),
      consciousness: z.string().optional(),
      chiefComplaint: z.string().optional(),
    })
    .optional(),
})
  .refine((d) => Boolean(d.startsAt?.trim()) || (Boolean(d.date?.trim()) && Boolean(d.time?.trim())), {
    message: "Provide startsAt (ISO) or both date and time",
    path: ["startsAt"],
  })

function parseDateTime(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0)
  return dt
}

function tokenNumberFromCode(tokenCode: string): number {
  const parts = tokenCode.split("-")
  const last = parts[parts.length - 1]
  const n = parseInt(last ?? "0", 10)
  return Number.isFinite(n) ? n : 0
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  let startsAt: Date
  if (parsed.data.startsAt?.trim()) {
    startsAt = new Date(parsed.data.startsAt.trim())
  } else {
    startsAt = parseDateTime(parsed.data.date!, parsed.data.time!)
  }
  if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "Invalid date/time" }, { status: 400 })

  if (parsed.data.familyMemberId) {
    const fm = await prisma.familyMember.findFirst({
      where: { id: parsed.data.familyMemberId, userId: session.user.id },
    })
    if (!fm) return NextResponse.json({ error: "Family member not found" }, { status: 400 })
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: parsed.data.doctorId },
    include: { department: true, schedules: true },
  })
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
  if (doctor.departmentId !== parsed.data.departmentId) {
    return NextResponse.json({ error: "Doctor not in selected department" }, { status: 400 })
  }

  const schedule = doctor.schedules[0]
  const slotMinutes = schedule?.slotDurationMinutes ?? 15
  const endsAt = new Date(startsAt.getTime() + slotMinutes * 60000)

  const dayStart = new Date(startsAt)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(startsAt)
  dayEnd.setHours(23, 59, 59, 999)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: { doctorId: doctor.id, startsAt, status: { not: "CANCELLED" } },
        select: { id: true },
      })
      if (conflict) throw new Error("SLOT_TAKEN")

      // Token numbers must be unique per department per day (tokenCode is globally unique).
      // We derive the next token from the latest existing token for this department/day.
      let appt:
        | (Awaited<
            ReturnType<
              typeof tx.appointment.create<{
                data: any
                include: { doctor: true; department: true }
              }>
            >
          >)
        | null = null

      for (let attempt = 0; attempt < 5; attempt++) {
        const last = await tx.appointment.findFirst({
          where: {
            departmentId: doctor.departmentId,
            startsAt: { gte: dayStart, lte: dayEnd },
            status: { not: "CANCELLED" },
          },
          orderBy: { tokenCode: "desc" },
          select: { tokenCode: true },
        })

        const nextNumber = (last?.tokenCode ? tokenNumberFromCode(last.tokenCode) : 0) + 1
        const tokenCode = generateTokenCode(doctor.department.code, startsAt, nextNumber)

        try {
          appt = await tx.appointment.create({
            data: {
              tokenCode,
              patientId:
                parsed.data.patientId && ["RECEPTIONIST", "ADMIN"].includes(String((session.user as any).role))
                  ? parsed.data.patientId
                  : session.user.id,
              familyMemberId: parsed.data.familyMemberId,
              departmentId: doctor.departmentId,
              doctorId: doctor.id,
              startsAt,
              endsAt,
              symptoms: parsed.data.symptoms,
              notes: parsed.data.notes,
              consultationFee: doctor.consultationFee,
              status: "CONFIRMED",
              isWalkIn: parsed.data.isWalkIn ?? false,
              priority: parsed.data.priority ?? "MEDIUM",
              triageScore: parsed.data.triage?.score,
              triageBpSystolic: parsed.data.triage?.bpSystolic,
              triageBpDiastolic: parsed.data.triage?.bpDiastolic,
              triagePulse: parsed.data.triage?.pulse,
              triageTemperature: parsed.data.triage?.temperature,
              triageSpo2: parsed.data.triage?.spo2,
              triagePainLevel: parsed.data.triage?.painLevel,
              triageConsciousness: parsed.data.triage?.consciousness,
              triageChiefComplaint: parsed.data.triage?.chiefComplaint,
            },
            include: { doctor: true, department: true },
          })
          break
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          // Prisma unique constraint failures often include tokenCode; retry a few times.
          if (msg.includes("tokenCode") || msg.includes("Unique constraint")) {
            appt = null
            continue
          }
          throw err
        }
      }

      if (!appt) throw new Error("TOKEN_GENERATION_FAILED")

    const qe = await tx.queueEntry.create({
      data: {
        appointmentId: appt.id,
        doctorId: doctor.id,
        position:
          (await tx.queueEntry.count({
            where: { doctorId: doctor.id, status: { in: ["WAITING", "CALLED", "IN_CONSULTATION"] } },
          })) + 1,
        estimatedWaitMinutes: 0,
      },
    })

    const bill = computeBill(doctor.consultationFee, defaultLabItems(), 0.05)
    await tx.payment.create({
      data: {
        appointmentId: appt.id,
        amount: bill.total,
        breakdownJson: JSON.stringify(bill),
        status: "PENDING",
      },
    })

    return { appt, qe }
  })

    await QueueService.recalculateEstimates(result.appt.doctorId)
    const status = await QueueService.getStatus(result.appt.id)

    try {
      const notifier = new NotificationService()
      const doctorName = result.appt.doctor?.name ?? "your doctor"
      const when = result.appt.startsAt.toLocaleString()
      await notifier.send(result.appt.patientId, {
        title: "Appointment confirmed",
        message: `Your appointment with ${doctorName} on ${when} is confirmed. Token: ${result.appt.tokenCode}.`,
        channels: ["WHATSAPP", "EMAIL", "IN_APP"],
        type: "SUCCESS",
        data: { appointmentId: result.appt.id, tokenCode: result.appt.tokenCode },
      })
    } catch (notifyErr) {
      console.error("[appointments] notification failed", notifyErr)
    }

    try {
      await emitToRoom(result.appt.doctorId, "queue:updated", { doctorId: result.appt.doctorId })
    } catch (emitErr) {
      console.error("[appointments] socket emit failed", emitErr)
    }

    return NextResponse.json({
      appointment: result.appt,
      tokenCode: result.appt.tokenCode,
      queue: status,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "That time slot is already taken. Wait one minute or choose a different time." },
        { status: 409 }
      )
    }
    if (msg === "TOKEN_GENERATION_FAILED") {
      return NextResponse.json({ error: "Could not generate a unique token. Please try again." }, { status: 409 })
    }
    console.error("[appointments] POST", e)
    return NextResponse.json({ error: msg || "Failed to create appointment" }, { status: 500 })
  }
}

