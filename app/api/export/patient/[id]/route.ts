import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { htmlToPdfBuffer } from "@/lib/pdf-from-html"
import {
  buildMedicalHistoryCoverHtml,
  buildMedicalHistoryTimelineHtml,
  type TimelineRecord,
} from "@/lib/medical-history-html"

export const runtime = "nodejs"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const records = await prisma.medicalRecord.findMany({
    where: { patientId: id },
    orderBy: { createdAt: "desc" },
    include: {
      doctor: true,
      appointment: { include: { department: true, familyMember: true } },
      prescriptions: true,
      labOrders: true,
    },
  })

  const timeline: TimelineRecord[] = records.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    summary: r.summary,
    diagnosis: r.diagnosis,
    notes: r.notes,
    followUpAt: r.followUpAt?.toLocaleString("en-IN", { dateStyle: "medium" }) ?? null,
    doctorName: r.doctor?.name ?? "—",
    departmentName: r.appointment?.department.name ?? "—",
    familyMemberName: r.appointment?.familyMember?.name ?? null,
    prescriptions: r.prescriptions.map((p) => ({
      medicineName: p.medicineName,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
    })),
    labOrders: r.labOrders.map((l) => ({
      testName: l.testName,
      status: l.status,
      resultUrl: l.resultUrl,
    })),
    prescriptionQrData: r.prescriptionQrData,
  }))

  const qrById: Record<string, string> = {}
  for (const r of records) {
    const payload = r.prescriptionQrData ?? `MR:${r.id}:PATIENT:${id}`
    try {
      qrById[r.id] = await QRCode.toDataURL(payload, { width: 160, margin: 1 })
    } catch {
      qrById[r.id] = ""
    }
  }

  const hospital = process.env.HOSPITAL_NAME ?? "City General Hospital"
  const generated = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  const html = `${buildMedicalHistoryCoverHtml(hospital, user.name, generated)}${buildMedicalHistoryTimelineHtml(timeline, qrById)}`

  const pdf = await htmlToPdfBuffer(html)

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="medical-history-${user.name.replace(/\s+/g, "-")}.pdf"`,
    },
  })
}
