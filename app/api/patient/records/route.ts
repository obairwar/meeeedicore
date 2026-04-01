import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const year = searchParams.get("year")
  const departmentId = searchParams.get("departmentId")
  const doctorId = searchParams.get("doctorId")
  const familyMemberId = searchParams.get("familyMemberId")

  const where: Prisma.MedicalRecordWhereInput = { patientId: session.user.id }

  if (year) {
    const y = Number(year)
    if (!Number.isNaN(y)) {
      where.createdAt = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) }
    }
  }

  const and: Prisma.MedicalRecordWhereInput[] = []
  if (departmentId) and.push({ appointment: { departmentId } })
  if (familyMemberId) and.push({ appointment: { familyMemberId } })
  if (doctorId) where.doctorId = doctorId
  if (and.length) where.AND = and

  const records = await prisma.medicalRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      doctor: true,
      appointment: { include: { department: true, familyMember: true } },
      prescriptions: true,
      labOrders: true,
    },
  })

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } })
  const doctors = await prisma.doctor.findMany({
    where: { medicalRecords: { some: { patientId: session.user.id } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      summary: r.summary,
      diagnosis: r.diagnosis,
      notes: r.notes,
      followUpAt: r.followUpAt?.toISOString() ?? null,
      doctorName: r.doctor?.name ?? "—",
      departmentName: r.appointment?.department.name ?? "—",
      departmentId: r.appointment?.departmentId ?? null,
      doctorId: r.doctorId,
      familyMemberName: r.appointment?.familyMember?.name ?? null,
      medicinesCount: r.prescriptions.length,
      labTestsCount: r.labOrders.length,
      prescriptions: r.prescriptions.map((p) => ({
        id: p.id,
        medicineName: p.medicineName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
      })),
      labOrders: r.labOrders.map((l) => ({
        id: l.id,
        testName: l.testName,
        status: l.status,
        resultUrl: l.resultUrl,
      })),
      prescriptionQrData: r.prescriptionQrData,
    })),
    filterOptions: { departments, doctors },
  })
}
