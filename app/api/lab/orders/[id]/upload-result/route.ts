import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getCloudinary } from "@/lib/cloudinary"
import { NotificationService } from "@/lib/notification-service"

export const runtime = "nodejs"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const order = await prisma.labOrder.findUnique({
    where: { id },
    include: { medicalRecord: { include: { patient: true, doctor: true } } },
  })
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const form = await req.formData()
  const file = form.get("file")
  const summary = form.get("summary")

  let resultUrl: string | null = null
  if (file && file instanceof File) {
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    const mime = file.type || "application/octet-stream"
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
    if (!allowed.includes(mime)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })

    const cloud = getCloudinary()
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUri = `data:${mime};base64,${base64}`

    const uploaded = await cloud.uploader.upload(dataUri, {
      folder: "hospital/lab-results",
      resource_type: "auto",
    })
    resultUrl = uploaded.secure_url
  }

  const updated = await prisma.labOrder.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      resultUrl,
      notes: typeof summary === "string" && summary.trim() ? summary.trim() : order.notes,
    },
  })

  const notifier = new NotificationService()
  const patientId = order.medicalRecord.patientId
  const doctorUserId = order.medicalRecord.doctor?.userId ?? null
  const testName = order.testName

  if (patientId) {
    await notifier.send(patientId, {
      title: "Lab result ready",
      message: `Your lab result for ${testName} is ready.`,
      channels: ["IN_APP", "EMAIL", "WHATSAPP"],
      type: "SUCCESS",
      data: { labOrderId: id },
    })
  }

  if (doctorUserId) {
    await notifier.send(doctorUserId, {
      title: "Lab result ready",
      message: `Lab result uploaded for ${testName}.`,
      channels: ["IN_APP", "EMAIL", "WHATSAPP"],
      type: "INFO",
      data: { labOrderId: id },
    })
  }

  return NextResponse.json({ ok: true, order: updated })
}

