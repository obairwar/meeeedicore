"use client"

import { useSession } from "next-auth/react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useRouter } from "@/i18n/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
export function SOSButton() {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session?.user?.role !== "PATIENT") return null

  async function confirm() {
    setLoading(true)
    setError(null)

    let location: { lat: number; lng: number } | null = null
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      })
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch {
      /* optional */
    }

    const res = await fetch("/api/emergency/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not send SOS.")
      setLoading(false)
      return
    }

    setOpen(false)
    setLoading(false)
    if (data.appointmentId) {
      router.push(`/queue/${data.appointmentId}`)
    }
  }

  return (
    <>
      <button
        type="button"
        title="Emergency SOS"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
        onClick={() => setOpen(true)}
        aria-label="Emergency SOS"
      >
        <AlertTriangle className="h-7 w-7" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle>Emergency SOS</CardTitle>
              <CardDescription>
                This will alert all available medical staff. Continue?
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => void confirm()}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </>
  )
}
