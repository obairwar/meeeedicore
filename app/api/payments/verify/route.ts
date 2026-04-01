import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { parseBreakdown } from "@/lib/payment-breakdown"
import { buildInvoiceHtml } from "@/lib/invoice-html"
import { htmlToPdfBuffer } from "@/lib/pdf-from-html"
import { getCloudinary } from "@/lib/cloudinary"
import { sendEmailWithAttachment } from "@/lib/send-email"
import { NotificationService } from "@/lib/notification-service"
import { formatCurrency } from "@/lib/utils"

export const runtime = "nodejs"

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
})

function hospitalName() {
  return process.env.HOSPITAL_NAME ?? "City General Hospital"
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 })

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data
  const expected = crypto.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex")
  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: razorpay_order_id },
    include: {
      appointment: {
        include: {
          patient: true,
          doctor: true,
          department: true,
        },
      },
    },
  })
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  if (payment.appointment.patientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (payment.status === "PAID") {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      invoiceUrl: payment.invoiceUrl,
      paymentId: payment.id,
    })
  }

  const paidAt = new Date()
  const breakdown = parseBreakdown(payment.breakdownJson)
  if (!breakdown) return NextResponse.json({ error: "Invalid bill data" }, { status: 500 })

  const patient = payment.appointment.patient
  const appt = payment.appointment
  const paidAtStr = paidAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })

  const html = buildInvoiceHtml({
    hospitalName: hospitalName(),
    patientName: patient.name,
    patientEmail: patient.email,
    doctorName: appt.doctor.name,
    departmentName: appt.department.name,
    appointmentDate: appt.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    tokenCode: appt.tokenCode,
    breakdown,
    transactionId: razorpay_payment_id,
    paidAt: paidAtStr,
  })

  const pdfBuffer = await htmlToPdfBuffer(html)

  let invoiceUrl: string | null = null
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const cloud = getCloudinary()
      const dataUri = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`
      const uploaded = await cloud.uploader.upload(dataUri, {
        folder: "hospital/invoices",
        resource_type: "raw",
        format: "pdf",
      })
      invoiceUrl = uploaded.secure_url
    } catch (e) {
      console.error("[invoice upload]", e)
    }
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      razorpayPaymentId: razorpay_payment_id,
      paidAt,
      invoiceUrl: invoiceUrl ?? undefined,
    },
  })

  const emailHtml = `<p>Hi ${escapeHtml(patient.name)},</p>
<p>Your payment of <strong>${formatCurrency(updated.amount)}</strong> for appointment token <strong>${escapeHtml(appt.tokenCode)}</strong> is confirmed.</p>
<p>Transaction ID: ${escapeHtml(razorpay_payment_id)}</p>
${invoiceUrl ? `<p><a href="${escapeHtml(invoiceUrl)}">Download invoice</a></p>` : ""}`

  if (patient.notifyEmail !== false) {
    await sendEmailWithAttachment(patient.email, `Payment receipt — ${hospitalName()}`, emailHtml, {
      filename: `invoice-${appt.tokenCode}.pdf`,
      content: pdfBuffer,
    })
  }

  const channels: ("IN_APP" | "SMS" | "WHATSAPP")[] = ["IN_APP"]
  if (patient.notifySms) channels.push("SMS")
  if (patient.notifyWhatsApp) channels.push("WHATSAPP")

  const notifier = new NotificationService()
  await notifier.send(patient.id, {
    title: "Payment confirmed",
    message: `Payment of ${formatCurrency(updated.amount)} confirmed. Invoice: ${invoiceUrl ?? "sent to your email"}`,
    channels,
    type: "SUCCESS",
    data: { paymentId: updated.id, appointmentId: appt.id },
  })

  return NextResponse.json({
    ok: true,
    paymentId: updated.id,
    invoiceUrl: updated.invoiceUrl,
  })
}
