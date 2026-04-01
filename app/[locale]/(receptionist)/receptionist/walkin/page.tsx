"use client"

import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useRouter } from "@/i18n/navigation"
import { Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Patient = {
  id: string
  name: string
  phone?: string | null
  gender?: string | null
  bloodGroup?: string | null
}
type Department = { id: string; code: string; name: string; floor: string; doctorsCount: number }
type Doctor = {
  id: string
  name: string
  specialization: string
  consultationFee: number
  queueLengthToday?: number
  department: { id: string; code: string }
}

const newPatientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(8),
  bloodGroup: z.string().optional(),
})

type NewPatientValues = z.infer<typeof newPatientSchema>

async function parseJsonSafe<T>(r: Response): Promise<T | null> {
  const text = await r.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function triageScore(v: {
  spo2?: number
  pain?: number
  pulse?: number
  consciousness?: string
}) {
  const spo2 = v.spo2 ?? 98
  const pain = v.pain ?? 1
  const pulse = v.pulse ?? 80
  const conc = (v.consciousness ?? "Alert").toLowerCase()

  if (spo2 < 90 || conc === "unresponsive") return 1
  if (spo2 <= 94 || pulse > 120 || pain >= 8) return 2
  if (pulse > 110 || pain >= 6) return 3
  if (pulse > 100 || pain >= 4) return 4
  return 5
}

function triagePriority(score: number) {
  if (score <= 2) return { label: "EMERGENCY", priority: "EMERGENCY" as const, cls: "bg-red-600" }
  if (score === 3) return { label: "URGENT", priority: "HIGH" as const, cls: "bg-amber-500 text-black" }
  return { label: "NORMAL", priority: "MEDIUM" as const, cls: "bg-emerald-600" }
}

export default function WalkInPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Patient[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const newPatientForm = useForm<NewPatientValues>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: { gender: "MALE", bloodGroup: "" },
  })

  async function doSearch() {
    setSearching(true)
    try {
      const r = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, { cache: "no-store" })
      const j = await parseJsonSafe<unknown>(r)
      setResults(Array.isArray(j) ? (j as Patient[]) : [])
    } finally {
      setSearching(false)
    }
  }

  async function registerNewPatient(values: NewPatientValues) {
    const r = await fetch("/api/patients/create-walkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        phone: values.phone,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
        bloodGroup: values.bloodGroup?.trim() || undefined,
      }),
    })
    const j = await parseJsonSafe<{ error?: string; user?: Patient }>(r)
    if (!r.ok) throw new Error(j?.error ?? `Request failed (${r.status})`)
    if (!j?.user) throw new Error(j?.error ?? "Invalid response from server")
    setPatient(j.user)
    setStep(2)
    setShowNewForm(false)
  }

  const [triage, setTriage] = useState({
    bpSys: 120,
    bpDia: 80,
    pulse: 82,
    temp: 98.6,
    spo2: 98,
    pain: 2,
    consciousness: "Alert",
    complaint: "",
  })

  const score = useMemo(
    () => triageScore({ spo2: triage.spo2, pain: triage.pain, pulse: triage.pulse, consciousness: triage.consciousness }),
    [triage]
  )
  const pr = useMemo(() => triagePriority(score), [score])

  const [departments, setDepartments] = useState<Department[]>([])
  const [dept, setDept] = useState<Department | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctor, setDoctor] = useState<Doctor | null>(null)

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    if (!dept) return
    fetch(`/api/doctors?departmentId=${dept.id}&withQueueLength=1`)
      .then((r) => r.json())
      .then(setDoctors)
      .catch(() => setDoctors([]))
  }, [dept])

  const [creating, setCreating] = useState(false)

  async function createWalkIn() {
    if (!patient || !dept || !doctor) return
    setCreating(true)
    try {
      const now = new Date()
      const r = await fetch("/api/appointments/walkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          departmentId: dept.id,
          doctorId: doctor.id,
          startsAt: now.toISOString(),
          symptoms: triage.complaint || "Walk-in",
          notes: "Walk-in triage",
          isWalkIn: true,
          priority: pr.priority,
          triage: {
            score,
            bpSystolic: triage.bpSys,
            bpDiastolic: triage.bpDia,
            pulse: triage.pulse,
            temperature: triage.temp,
            spo2: triage.spo2,
            painLevel: triage.pain,
            consciousness: triage.consciousness,
            chiefComplaint: triage.complaint,
          },
        }),
      })
      const j = await parseJsonSafe<{ error?: string; appointment?: { id: string } }>(r)
      if (!r.ok) throw new Error(j?.error ?? `Request failed (${r.status})`)
      if (!j?.appointment?.id) {
        throw new Error(j?.error ?? "Invalid response from server (empty or not JSON)")
      }
      router.push(`/receptionist/token/${j.appointment.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Walk-in Registration</h1>
          <p className="text-slate-600">Step {step} / 4</p>
        </div>
        <Link className="text-sm text-sky-700 hover:underline" href="/receptionist/dashboard">
          Back to dashboard
        </Link>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Find or Create Patient</CardTitle>
            <CardDescription>Search by phone or name, or register a new patient.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Phone or name..." className="max-w-md" />
              <Button onClick={doSearch} disabled={searching || query.trim().length < 2}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span className={searching ? "ml-2" : ""}>Search</span>
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowNewForm((v) => !v)}>
                New patient
              </Button>
            </div>

            {results.length ? (
              <div className="grid gap-2">
                {results.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-sm text-slate-600">{p.phone ?? "—"}</div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPatient(p)
                        setStep(2)
                      }}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">{query.trim().length >= 2 ? "No matches." : "Type at least 2 characters and search."}</div>
            )}

            {showNewForm ? (
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="mb-2 font-semibold text-slate-900">Quick registration</div>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={newPatientForm.handleSubmit(registerNewPatient)}>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Name</Label>
                    <Input {...newPatientForm.register("name")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input {...newPatientForm.register("phone")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date of birth</Label>
                    <Input type="date" {...newPatientForm.register("dateOfBirth")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <select className="h-10 w-full rounded-md border bg-white px-3 text-sm" {...newPatientForm.register("gender")}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Blood group (optional)</Label>
                    <Input {...newPatientForm.register("bloodGroup")} placeholder="e.g. O+" />
                  </div>
                  <div className="sm:col-span-2">
                    <Button className="bg-sky-600 hover:bg-sky-700" type="submit">
                      Create patient
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Triage</CardTitle>
            <CardDescription>Score updates as you change vitals (1–5).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-white p-3">
              <div className="text-sm text-slate-700">
                Triage score: <span className="font-semibold">{score}</span>
              </div>
              <Badge className={pr.cls}>{pr.label}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label>BP Systolic</Label>
                <Input type="number" value={triage.bpSys} onChange={(e) => setTriage((t) => ({ ...t, bpSys: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>BP Diastolic</Label>
                <Input type="number" value={triage.bpDia} onChange={(e) => setTriage((t) => ({ ...t, bpDia: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Pulse</Label>
                <Input type="number" value={triage.pulse} onChange={(e) => setTriage((t) => ({ ...t, pulse: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Temperature (°F)</Label>
                <Input type="number" value={triage.temp} onChange={(e) => setTriage((t) => ({ ...t, temp: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>SpO2</Label>
                <Input type="number" value={triage.spo2} onChange={(e) => setTriage((t) => ({ ...t, spo2: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Pain level (1-10)</Label>
                <Input type="range" min={1} max={10} value={triage.pain} onChange={(e) => setTriage((t) => ({ ...t, pain: Number(e.target.value) }))} />
                <div className="text-xs text-slate-600">Selected: {triage.pain}</div>
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <Label>Consciousness</Label>
                <select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={triage.consciousness} onChange={(e) => setTriage((t) => ({ ...t, consciousness: e.target.value }))}>
                  <option>Alert</option>
                  <option>Verbal</option>
                  <option>Pain</option>
                  <option>Unresponsive</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <Label>Chief complaint</Label>
                <Input value={triage.complaint} onChange={(e) => setTriage((t) => ({ ...t, complaint: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setStep(3)}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Department + Doctor</CardTitle>
            <CardDescription>Queue length is for today&apos;s active queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={cn("rounded-lg border p-4 text-left hover:bg-slate-50", dept?.id === d.id && "border-sky-300 bg-sky-50")}
                  onClick={() => {
                    setDept(d)
                    setDoctor(null)
                  }}
                >
                  <div className="font-semibold text-slate-900">{d.name}</div>
                  <div className="text-sm text-slate-600">
                    {d.code} • Floor {d.floor}
                  </div>
                </button>
              ))}
            </div>

            {dept ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    className={cn("rounded-lg border p-4 text-left hover:bg-slate-50", doctor?.id === doc.id && "border-emerald-300 bg-emerald-50")}
                    onClick={() => setDoctor(doc)}
                  >
                    <div className="font-semibold text-slate-900">{doc.name}</div>
                    <div className="text-sm text-slate-600">{doc.specialization}</div>
                    <div className="mt-1 text-xs text-slate-500">Queue today: {doc.queueLengthToday ?? 0}</div>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button className="bg-sky-600 hover:bg-sky-700" disabled={!dept || !doctor} onClick={() => setStep(4)}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Confirm + Generate Token</CardTitle>
            <CardDescription>Creates the walk-in appointment and opens the printable token.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 rounded-lg border bg-white p-4">
              <div className="font-semibold text-slate-900">{patient?.name}</div>
              <div className="text-sm text-slate-600">{patient?.phone ?? "—"}</div>
              <div className="text-sm text-slate-600">
                Dept: {dept?.name} • Doctor: {doctor?.name}
              </div>
              <div className="text-sm text-slate-600">
                Priority: <Badge className={pr.cls}>{pr.label}</Badge>
              </div>
            </div>

            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={createWalkIn} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={creating ? "ml-2" : ""}>Generate token</span>
            </Button>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} disabled={creating}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
