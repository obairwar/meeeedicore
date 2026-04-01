"use client"

import { useMemo, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Bed = {
  id: string
  ward: "GENERAL" | "ICU" | "EMERGENCY" | "PRIVATE"
  bedNumber: string
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE"
  patient: null | { id: string; name: string; phone?: string | null }
  admittedAt: string | null
  notes?: string | null
}

export function WardMap({ beds, onUpdate }: { beds: Bed[]; onUpdate: (bedId: string, patch: any) => Promise<void> }) {
  const wards = useMemo(() => {
    const by: Record<string, Bed[]> = { GENERAL: [], ICU: [], EMERGENCY: [], PRIVATE: [] }
    beds.forEach((b) => by[b.ward].push(b))
    Object.values(by).forEach((arr) => arr.sort((a, b) => a.bedNumber.localeCompare(b.bedNumber)))
    return by as Record<Bed["ward"], Bed[]>
  }, [beds])

  const stats = useMemo(() => {
    const s = { AVAILABLE: 0, OCCUPIED: 0, MAINTENANCE: 0 }
    beds.forEach((b) => (s[b.status] += 1))
    return s
  }, [beds])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-600">Available: {stats.AVAILABLE}</Badge>
        <Badge className="bg-red-600">Occupied: {stats.OCCUPIED}</Badge>
        <Badge className="bg-amber-500 text-black">Maintenance: {stats.MAINTENANCE}</Badge>
      </div>

      {(["GENERAL", "ICU", "EMERGENCY", "PRIVATE"] as const).map((ward) => (
        <div key={ward} className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">{ward}</h2>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
            {wards[ward].map((b) => (
              <BedCard key={b.id} bed={b} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BedCard({ bed, onUpdate }: { bed: any; onUpdate: (bedId: string, patch: any) => Promise<void> }) {
  const color =
    bed.status === "AVAILABLE" ? "bg-emerald-50 border-emerald-200" : bed.status === "OCCUPIED" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            className={cn("rounded-lg border p-3 text-left hover:opacity-90", color)}
            aria-label={`Bed ${bed.bedNumber}`}
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-900">{bed.bedNumber}</div>
          <Badge variant="outline">{bed.status}</Badge>
        </div>
        <div className="text-xs text-slate-600 mt-2">{bed.patient?.name ?? "—"}</div>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[520px]">
        <SheetHeader>
          <SheetTitle>
            {bed.ward} • {bed.bedNumber}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            <div>Status: <span className="font-medium">{bed.status}</span></div>
            <div>Patient: <span className="font-medium">{bed.patient?.name ?? "—"}</span></div>
          </div>

          {bed.status === "AVAILABLE" ? (
            <AdmitForm bed={bed} onUpdate={onUpdate} />
          ) : null}

          {bed.status === "OCCUPIED" ? (
            <OccupiedPanel bed={bed} onUpdate={onUpdate} />
          ) : null}

          {bed.status === "MAINTENANCE" ? (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onUpdate(bed.id, { status: "AVAILABLE", patientId: null })}>
              Mark as Available
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AdmitForm({ bed, onUpdate }: { bed: any; onUpdate: any }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState("")

  async function search() {
    setLoading(true)
    try {
      const r = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      const j = await r.json()
      setResults(Array.isArray(j) ? j : [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="font-medium text-slate-900">Admit Patient</div>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient by name/phone" />
        <Button variant="outline" onClick={search} disabled={loading || q.trim().length < 2}>
          Search
        </Button>
      </div>
      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
      <div className="space-y-2">
        {results.map((p) => (
          <div key={p.id} className="rounded-md border p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-600">{p.phone ?? "—"}</div>
            </div>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={() => onUpdate(bed.id, { status: "OCCUPIED", patientId: p.id, notes })}
            >
              Admit
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function OccupiedPanel({ bed, onUpdate }: { bed: any; onUpdate: any }) {
  return (
    <div className="space-y-3">
      <div className="font-medium text-slate-900">Actions</div>
      <Button variant="destructive" onClick={() => onUpdate(bed.id, { status: "AVAILABLE", patientId: null })}>
        Discharge Patient
      </Button>
      <Button variant="outline" onClick={() => alert("Transfer flow will be wired next")}>
        Transfer to another bed
      </Button>
      <Button variant="outline" onClick={() => onUpdate(bed.id, { status: "MAINTENANCE", patientId: null })}>
        Mark Maintenance
      </Button>
    </div>
  )
}

