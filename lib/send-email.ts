import nodemailer from "nodemailer"

export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  htmlBody: string,
  attachment: { filename: string; content: Buffer }
) {
  const host = process.env.EMAIL_HOST
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  if (!host || !port || !user || !pass) {
    console.log("[EMAIL MOCK attachment]", to, subject, attachment.filename, attachment.content.length, "bytes")
    return
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
  await transporter.sendMail({
    from: user,
    to,
    subject,
    html: htmlBody,
    attachments: [{ filename: attachment.filename, content: attachment.content }],
  })
}
