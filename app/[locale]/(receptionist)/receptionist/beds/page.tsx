"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { WardMap } from "@/components/beds/WardMap"
import { useSocket } from "@/components/shared/SocketProvider"

type Bed = {
  id: string
  ward: "GENERAL" | "ICU" | "EMERGENCY" | "PRIVATE"
  bedNumber: string
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE"
  patient: null | { id: string; name: string; phone?: string | null }
  admittedAt: string | null
  notes?: string | null
}

export default function BedsPage() {
  const { socket, connected } = useSocket()
  const [beds, setBeds] = useState<Bed[]>([])

  async function refresh() {
    const r = await fetch("/api/beds", { cache: "no-store" })
    const j = await r.json()
    setBeds(Array.isArray(j) ? j : [])
  }

  async function updateBed(bedId: string, patch: any) {
    await fetch(`/api/beds/${bedId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    })
    await refresh()
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!socket || !connected) return
    socket.emit("join", { room: "beds" })
    const onChanged = () => refresh()
    socket.on("bed:status_changed", onChanged)
    return () => {
      socket.off("bed:status_changed", onChanged)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bed Map</h1>
          <p className="text-slate-600">Real-time updates: {connected ? "connected" : "polling"}</p>
        </div>
        <Link className="text-sm text-sky-700 hover:underline" href="/receptionist/dashboard">
          Back to dashboard
        </Link>
      </div>

      <WardMap beds={beds} onUpdate={updateBed} />
    </div>
  )
}

