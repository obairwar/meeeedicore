import { prisma } from "@/lib/prisma"
import { emitToRoom } from "@/lib/socket-emit"
import nodemailer from "nodemailer"
import twilio from "twilio"

type Channel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP"

export class NotificationService {
  async send(
    userId: string,
    {
      title,
      message,
      channels,
      data,
      type,
    }: {
      title: string
      message: string
      channels: Channel[]
      data?: Record<string, unknown>
      type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
    }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return

    const notification = await this.saveToDb(userId, {
      title,
      body: message,
      type: type ?? "INFO",
    })

    await Promise.all(
      channels.map(async (ch) => {
        if (ch === "IN_APP") return this.sendInApp(userId, { ...notification, data })
        if (ch === "EMAIL") return this.sendEmail(user.email, title, `<p>${escapeHtml(message)}</p>`)
        if (ch === "SMS") return user.phone ? this.sendSMS(user.phone, message) : undefined
        if (ch === "WHATSAPP") return user.phone ? this.sendWhatsApp(user.phone, message) : undefined
      })
    )
  }

  private async sendInApp(userId: string, payload: unknown) {
    await emitToRoom(userId, "notification:new", payload)
  }

  private async sendWhatsApp(phone: string, message: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_NUMBER
    if (!sid || !token || !from) {
      console.log("[WHATSAPP MOCK]", phone, message)
      return
    }
    const client = twilio(sid, token)
    await client.messages.create({ from, to: `whatsapp:${phone}`, body: message })
  }

  private async sendSMS(phone: string, message: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_PHONE_NUMBER
    if (!sid || !token || !from) {
      console.log("[SMS MOCK]", phone, message)
      return
    }
    const client = twilio(sid, token)
    await client.messages.create({ from, to: phone, body: message })
  }

  private async sendEmail(email: string, subject: string, htmlBody: string) {
    const host = process.env.EMAIL_HOST
    const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined
    const user = process.env.EMAIL_USER
    const pass = process.env.EMAIL_PASS
    if (!host || !port || !user || !pass) {
      console.log("[EMAIL MOCK]", email, subject, htmlBody)
      return
    }
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
    await transporter.sendMail({ from: user, to: email, subject, html: htmlBody })
  }

  private async saveToDb(
    userId: string,
    notification: { title: string; body: string; type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" }
  ) {
    return prisma.notification.create({
      data: { userId, title: notification.title, body: notification.body, type: notification.type },
    })
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

