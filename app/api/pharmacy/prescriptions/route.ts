import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const querySchema = z.object({ q: z.string().optional() })

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? undefined })
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

  const q = parsed.data.q?.trim()

  const records = await prisma.medicalRecord.findMany({
    where: q
      ? {
          OR: [
            { patient: { name: { contains: q } } },
            { appointment: { tokenCode: { contains: q } } },
            { prescriptionQrData: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      patient: true,
      doctor: true,
      appointment: true,
      prescriptions: { orderBy: { createdAt: "asc" } },
    },
  })

  const withAny = records.filter((r) => r.prescriptions.length > 0)

  const payload = withAny.map((r) => {
    const pending = r.prescriptions.filter((p) => !p.dispensedAt).length
    return {
      medicalRecordId: r.id,
      createdAt: r.createdAt,
      tokenCode: r.appointment?.tokenCode ?? null,
      diagnosis: r.diagnosis ?? null,
      qrData: r.prescriptionQrData ?? null,
      patient: { id: r.patient.id, name: r.patient.name },
      doctor: r.doctor ? { id: r.doctor.id, name: r.doctor.name } : null,
      items: r.prescriptions.map((p) => ({
        id: p.id,
        medicineName: p.medicineName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
        dispensedAt: p.dispensedAt,
      })),
      medicinesCount: r.prescriptions.length,
      pendingCount: pending,
      status: pending === 0 ? "DISPENSED" : "PENDING",
    }
  })

  return NextResponse.json(payload)
}

