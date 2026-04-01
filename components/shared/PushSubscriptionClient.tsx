"use client"

import { useSession } from "next-auth/react"
import { useEffect, useRef } from "react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushSubscriptionClient() {
  const { data: session, status } = useSession()
  const tried = useRef(false)

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "PATIENT") return
    if (tried.current) return
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return

    tried.current = true
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: existing.toJSON() }),
          })
          return
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        })
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
      } catch {
        /* permission denied or unsupported */
      }
    })()
  }, [session?.user?.role, status])

  return null
}
