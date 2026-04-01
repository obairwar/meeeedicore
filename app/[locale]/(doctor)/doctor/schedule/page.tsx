"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const
const SLOT_OPTS = [10, 15, 20, 30]

type Appt = {
  id: string
  tokenCode: string
  status: string
  startsAt: string
  timeSlot: string
  patientName: string
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export default function DoctorSchedulePage() {
  const { data: session, status } = useSession()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [schedules, setSchedules] = useState<
    Array<{ dayOfWeek: string; workStartTime: string; workEndTime: string; slotDurationMinutes: number }>
  >([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startT, setStartT] = useState("09:00")
  const [endT, setEndT] = useState("17:00")
  const [slot, setSlot] = useState(15)
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(["MON", "TUE", "WED", "THU", "FRI"]))

  const loadDoctor = useCallback(async () => {
    const r = await fetch("/api/doctors/me", { cache: "no-store" })
    const j = await r.json()
    if (j.success && j.data?.id) setDoctorId(j.data.id)
  }, [])

  const loadWeek = useCallback(async () => {
    if (!doctorId) return
    const from = weekStart.toISOString()
    const to = addDays(weekStart, 7).toISOString()
    const r = await fetch(`/api/doctors/me/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      cache: "no-store",
    })
    const j = await r.json()
    if (j.success && j.data?.appointments) setAppointments(j.data.appointments)
  }, [doctorId, weekStart])

  const loadSchedule = useCallback(async () => {
    if (!doctorId) return
    const r = await fetch(`/api/doctors/${doctorId}/schedule`, { cache: "no-store" })
    const j = await r.json()
    if (j.schedules?.length) {
      setSchedules(j.schedules)
      const first = j.schedules[0]
      setStartT(first.workStartTime)
      setEndT(first.workEndTime)
      setSlot(first.slotDurationMinutes)
      setSelectedDays(new Set(j.schedules.map((s: { dayOfWeek: string }) => s.dayOfWeek)))
    }
  }, [doctorId])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "DOCTOR") void loadDoctor()
  }, [status, session, loadDoctor])

  useEffect(() => {
    if (doctorId) {
      void loadSchedule()
    }
  }, [doctorId, loadSchedule])

  useEffect(() => {
    if (doctorId) void loadWeek()
  }, [doctorId, weekStart, loadWeek])

  useEffect(() => {
    setLoading(!(doctorId && appointments !== undefined))
  }, [doctorId, appointments])

  const byDay = useMemo(() => {
    const m = new Map<string, Appt[]>()
    for (const d of DAYS) m.set(d, [])
    for (const a of appointments) {
      const dt = new Date(a.startsAt)
      const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dt.getDay()] as (typeof DAYS)[number]
      if (!m.has(dow)) continue
      m.get(dow)!.push(a)
    }
    return m
  }, [appointments])

  async function saveSchedule() {
    if (!doctorId) return
    setSaving(true)
    try {
      const schedulesPayload = Array.from(selectedDays).map((day) => ({
        dayOfWeek: day,
        workStartTime: startT,
        workEndTime: endT,
        slotDurationMinutes: slot,
      }))
      await fetch(`/api/doctors/${doctorId}/schedule`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schedules: schedulesPayload }),
      })
      await loadSchedule()
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || (status === "authenticated" && !doctorId)) {
    return (
      <div className="flex items-center gap-2 p-6 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  if (session?.user?.role !== "DOCTOR") {
    return <p className="p-6 text-slate-600">Doctor access only.</p>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600">
            {weekStart.toLocaleDateString()} – {addDays(weekStart, 6).toLocaleDateString()}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {DAYS.map((d) => {
          const colDate = addDays(weekStart, DAYS.indexOf(d))
          const isToday = colDate.getTime() === today.getTime()
          return (
            <Card key={d} className={cn(isToday && "ring-2 ring-sky-500")}>
              <CardHeader className="py-2">
                <CardTitle className="text-sm"> {d}</CardTitle>
                <div className="text-xs text-slate-500">{colDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {(byDay.get(d) ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400">—</p>
                ) : (
                  (byDay.get(d) ?? []).map((a) => (
                    <div key={a.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                      <div className="font-medium">{a.timeSlot}</div>
                      <div className="text-slate-700"> {a.patientName}</div>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {a.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {DAYS.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selectedDays.has(d)} onCheckedChange={(v) => {
                  setSelectedDays((prev) => {
                    const n = new Set(prev)
                    if (v) n.add(d)
                    else n.delete(d)
                    return n
                  })
                }} />
                {d}
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Start</Label>
              <input className="mt-1 flex h-10 w-full rounded-md border px-3 text-sm" type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <input className="mt-1 flex h-10 w-full rounded-md border px-3 text-sm" type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
            </div>
            <div>
              <Label>Slot (min)</Label>
              <select className="mt-1 flex h-10 w-full rounded-md border px-3 text-sm" value={slot} onChange={(e) => setSlot(Number(e.target.value))}>
                {SLOT_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button className="bg-sky-600 hover:bg-sky-700" disabled={saving} onClick={() => void saveSchedule()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save schedule
          </Button>
          {schedules.length ? (
            <p className="text-xs text-slate-500">{schedules.length} day rows saved in database.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
