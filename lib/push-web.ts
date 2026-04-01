import webpush from "web-push"

import { prisma } from "@/lib/prisma"

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@hospital.local"

if (typeof vapidPublic === "string" && typeof vapidPrivate === "string" && vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
}

export function isWebPushConfigured() {
  return Boolean(vapidPublic && vapidPrivate)
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; tag?: string; data?: Record<string, string> }
) {
  if (!isWebPushConfigured()) return

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.pushSubscriptionJson) return

  let subscription: webpush.PushSubscription
  try {
    subscription = JSON.parse(user.pushSubscriptionJson) as webpush.PushSubscription
  } catch {
    return
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag ?? "hospital-queue",
    data: payload.data ?? {},
  })

  try {
    await webpush.sendNotification(subscription, body, { TTL: 60 })
  } catch (e) {
    console.error("[webpush] send failed", e)
    await prisma.user.update({
      where: { id: userId },
      data: { pushSubscriptionJson: null },
    })
  }
}
