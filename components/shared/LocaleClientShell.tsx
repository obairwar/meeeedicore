"use client"

import { Toaster } from "sonner"

import { EmergencyAlertOverlay } from "@/components/shared/EmergencyAlertOverlay"
import { PushSubscriptionClient } from "@/components/shared/PushSubscriptionClient"
import { RouteProgress } from "@/components/shared/RouteProgress"

export function LocaleClientShell() {
  return (
    <>
      <RouteProgress />
      <EmergencyAlertOverlay />
      <PushSubscriptionClient />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={3000}
        toastOptions={{
          classNames: {
            error: "group-[.toaster]:text-red-950",
            success: "group-[.toaster]:text-emerald-950",
          },
        }}
      />
    </>
  )
}
