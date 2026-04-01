"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "@/i18n/navigation"
import { useEffect, useState } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { useSocket } from "@/components/shared/SocketProvider"

type AlertPayload = {
  patientId: string
  patientName: string
  location: { lat: number; lng: number } | null
  timestamp: string
  appointmentId?: string
}

const STAFF = ["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "PHARMACIST", "LAB_TECHNICIAN"] as const

export function EmergencyAlertOverlay() {
  const { data: session } = useSession()
  const { socket } = useSocket()
  const router = useRouter()
  const [alert, setAlert] = useState<AlertPayload | null>(null)
  const [canDismiss, setCanDismiss] = useState(false)

  const role = session?.user?.role
  const isStaff = role && STAFF.includes(role as (typeof STAFF)[number])

  useEffect(() => {
    if (!alert) {
      document.body.classList.remove("emergency-sos-active")
      return
    }
    document.body.classList.add("emergency-sos-active")
    setCanDismiss(false)
    const t = setTimeout(() => setCanDismiss(true), 5000)
    return () => {
      clearTimeout(t)
      document.body.classList.remove("emergency-sos-active")
    }
  }, [alert])

  useEffect(() => {
    if (!socket || !isStaff) return
    const onAlert = (payload: AlertPayload) => {
      setAlert(payload)
    }
    socket.on("emergency:alert", onAlert)
    return () => {
      socket.off("emergency:alert", onAlert)
    }
  }, [socket, isStaff])

  if (!isStaff || !alert) return null

  const loc =
    alert.location != null
      ? `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}`
      : "Location unavailable"

  function accept() {
    setAlert(null)
    if (role === "DOCTOR") {
      router.push("/doctor/dashboard")
    } else {
      router.push("/receptionist/dashboard")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border-4 border-red-500 bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-red-700">Emergency SOS</h2>
        <p className="mt-2 text-slate-800">
          <span className="font-medium">Patient:</span> {alert.patientName}
        </p>
        <p className="mt-1 text-slate-700">
          <span className="font-medium">Location:</span> {loc}
        </p>
        <p className="mt-1 text-slate-600 text-sm">
          <span className="font-medium">Time:</span>{" "}
          {format(new Date(alert.timestamp), "PPpp")}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => void accept()}
          >
            Accept &amp; Attend
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canDismiss}
            onClick={() => setAlert(null)}
          >
            Dismiss{canDismiss ? "" : " (5s)"}
          </Button>
        </div>
      </div>
    </div>
  )
}
