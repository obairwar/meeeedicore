"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { Link as LocalizedLink, useRouter } from "@/i18n/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency } from "@/lib/utils"
import { toastError, toastSuccess } from "@/lib/toast-api"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Department = { id: string; code: string; name: string; floor: string; doctorsCount: number }
type Doctor = {
  id: string
  name: string
  specialization: string
  experienceYears: number
  rating: number
  consultationFee: number
  bio?: string | null
  photoUrl?: string | null
  department: { id: string; name: string; code: string }
  availableDays: string[]
}

type Slot = { time: string; available: boolean }

const detailsSchema = z.object({
  symptoms: z.string().min(5, "Symptoms are required"),
  notes: z.string().optional(),
})

type DetailsValues = z.infer<typeof detailsSchema>

const STEPS = [
  "AI Symptom Check (optional)",
  "Select Department",
  "Select Doctor",
  "Select Date & Time",
  "Patient Details",
  "Review & Confirm",
  "Confirmation",
] as const

function urgencyBadge(u: string) {
  const v = u.toUpperCase()
  if (v === "CRITICAL") return <Badge className="bg-red-600">CRITICAL</Badge>
  if (v === "HIGH") return <Badge className="bg-orange-500">HIGH</Badge>
  if (v === "MEDIUM") return <Badge className="bg-yellow-500 text-black">MEDIUM</Badge>
  return <Badge className="bg-emerald-600">LOW</Badge>
}

function BookPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedFamilyMemberId = searchParams.get("familyMemberId")
  const [step, setStep] = useState(0)

  const [departments, setDepartments] = useState<Department[]>([])
  const [deptQuery, setDeptQuery] = useState("")
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  const [date, setDate] = useState<string>("")
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [slotsLoading, setSlotsLoading] = useState(false)

  const [aiText, setAiText] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestedDepartment: { id: string; code: string; name: string; floor: string } | null
    urgency: string
    rationale: string
  } | null>(null)

  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    appointment: { id: string; consultationFee: number; doctor?: { name: string }; department?: { name: string } }
    tokenCode: string
    queue: { position: number; estimatedWaitMinutes: number }
  } | null>(null)

  const detailsForm = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { symptoms: "", notes: "" },
  })

  const filteredDepts = useMemo(() => {
    const q = deptQuery.trim().toLowerCase()
    if (!q) return departments
    return departments.filter((d) => `${d.name} ${d.code} ${d.floor}`.toLowerCase().includes(q))
  }, [departments, deptQuery])

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d))
      .catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    if (!selectedDept) return
    fetch(`/api/doctors?departmentId=${encodeURIComponent(selectedDept.id)}`)
      .then((r) => r.json())
      .then((d) => setDoctors(d))
      .catch(() => setDoctors([]))
  }, [selectedDept])

  async function loadSlots(nextDate: string, doctorId: string) {
    setSlotsLoading(true)
    setSlots([])
    setSelectedTime("")
    try {
      const r = await fetch(`/api/doctors/${doctorId}/slots?date=${encodeURIComponent(nextDate)}`)
      const j = await r.json()
      setSlots(j.slots ?? [])
    } finally {
      setSlotsLoading(false)
    }
  }

  async function checkWithAI() {
    setAiLoading(true)
    setAiSuggestion(null)
    try {
      const r = await fetch("/api/ai/symptom-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      })
      const j = await r.json()
      if (!r.ok) {
        toastError(j?.error ?? "Symptom check failed")
        return
      }
      setAiSuggestion(j)
      toastSuccess("Suggestion ready")
    } finally {
      setAiLoading(false)
    }
  }

  // wizard uses direct setStep per stage
  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function confirmBooking(values: DetailsValues) {
    if (!selectedDept || !selectedDoctor || !date || !selectedTime) return
    setConfirming(true)
    try {
      const r = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          departmentId: selectedDept.id,
          date,
          time: selectedTime,
          symptoms: values.symptoms,
          notes: values.notes,
          ...(preselectedFamilyMemberId ? { familyMemberId: preselectedFamilyMemberId } : {}),
        }),
      })
      const j = await r.json()
      if (!r.ok) {
        toastError(j?.error ?? "Booking failed")
        return
      }
      setConfirmation(j)
      setStep(6)
      toastSuccess("Appointment booked")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Book Appointment</h1>
          <p className="text-slate-600">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sky-600" /> AI Symptom Check (optional)
            </CardTitle>
            <CardDescription>Describe symptoms to get a suggested department + urgency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-28 w-full rounded-md border bg-white p-3 text-sm"
              placeholder="Describe your symptoms..."
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={checkWithAI} disabled={aiLoading || aiText.trim().length < 5} className="bg-sky-600 hover:bg-sky-700">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span className={aiLoading ? "ml-2" : ""}>Check with AI</span>
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                Skip
              </Button>
            </div>
            {aiSuggestion ? (
              <div className="rounded-md border bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">
                    Suggested: {aiSuggestion.suggestedDepartment?.name ?? "General Medicine"}
                  </div>
                  {urgencyBadge(aiSuggestion.urgency)}
                </div>
                <p className="text-sm text-slate-600">{aiSuggestion.rationale}</p>
                {aiSuggestion.suggestedDepartment ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const d = departments.find((x) => x.id === aiSuggestion.suggestedDepartment!.id) ?? null
                      setSelectedDept(d)
                      setStep(2)
                    }}
                  >
                    Use this suggestion
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Department</CardTitle>
            <CardDescription>Search and pick a department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search departments..." value={deptQuery} onChange={(e) => setDeptQuery(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDepts.map((d) => (
                <button
                  key={d.id}
                  className={cn(
                    "text-left rounded-lg border p-4 hover:bg-slate-50",
                    selectedDept?.id === d.id && "border-sky-300 bg-sky-50"
                  )}
                  onClick={() => setSelectedDept(d)}
                >
                  <div className="font-semibold text-slate-900">{d.name}</div>
                  <div className="text-sm text-slate-600">{d.code} • {d.floor}</div>
                  <div className="text-sm text-slate-600 mt-2">{d.doctorsCount} doctors</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={back}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => {
                  setSelectedDoctor(null)
                  setStep(2)
                }}
                disabled={!selectedDept}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Doctor</CardTitle>
            <CardDescription>Choose a doctor for {selectedDept?.name ?? "your department"}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doc) => (
                <div key={doc.id} className={cn("rounded-lg border p-4", selectedDoctor?.id === doc.id && "border-sky-300 bg-sky-50")}>
                  <div className="font-semibold text-slate-900">{doc.name}</div>
                  <div className="text-sm text-slate-600">{doc.specialization}</div>
                  <div className="text-sm text-slate-600 mt-2">
                    {doc.experienceYears} yrs • ⭐ {doc.rating.toFixed(1)} • {formatCurrency(doc.consultationFee)}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.availableDays.slice(0, 6).map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={() => setSelectedDoctor(doc)}>
                      Select
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
                      View Profile
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-80">
                        <div className="px-2 py-1.5 text-sm font-medium">{doc.name}</div>
                        <div className="px-2 pb-2 text-sm text-slate-600">{doc.bio ?? "Profile coming soon"}</div>
                        <Link
                          href={`/book/doctor/${doc.id}`}
                          className="block rounded-md px-2 py-1.5 text-sm text-sky-700 hover:bg-slate-50"
                        >
                          Open full profile
                        </Link>
                        <DropdownMenuItem onClick={() => setSelectedDoctor(doc)}>Select this doctor</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={back}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedDoctor}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-sky-600" /> Select Date & Time
            </CardTitle>
            <CardDescription>Pick a date, then choose an available slot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={async (e) => {
                    const v = e.target.value
                    setDate(v)
                    if (selectedDoctor && v) await loadSlots(v, selectedDoctor.id)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Slots</Label>
                <div className="text-sm text-slate-600">
                  {slotsLoading ? "Loading slots..." : `${slots.filter((s) => s.available).length} slots remaining`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {slotsLoading ? (
                <div className="col-span-full text-sm text-slate-600 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Fetching available slots...
                </div>
              ) : (
                slots.map((s) => {
                  const selected = selectedTime === s.time
                  return (
                    <button
                      key={s.time}
                      disabled={!s.available}
                      onClick={() => setSelectedTime(s.time)}
                      className={cn(
                        "h-10 rounded-md border text-sm",
                        s.available ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" : "bg-red-50 border-red-200 text-red-700 opacity-60 cursor-not-allowed",
                        selected && "bg-yellow-100 border-yellow-300"
                      )}
                    >
                      {s.time}
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={back}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!date || !selectedTime}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Patient Details</CardTitle>
            <CardDescription>
              Symptoms are required.
              {preselectedFamilyMemberId ? (
                <span className="block mt-1 text-sky-700">Booking for a family member (pre-selected).</span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="space-y-3" onSubmit={detailsForm.handleSubmit(() => setStep(5))}>
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms</Label>
                <textarea
                  id="symptoms"
                  className="min-h-28 w-full rounded-md border bg-white p-3 text-sm"
                  {...detailsForm.register("symptoms")}
                />
                {detailsForm.formState.errors.symptoms ? (
                  <p className="text-sm text-red-600">{detailsForm.formState.errors.symptoms.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  className="min-h-20 w-full rounded-md border bg-white p-3 text-sm"
                  {...detailsForm.register("notes")}
                />
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button type="submit" className="bg-sky-600 hover:bg-sky-700">
                  Next <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review & Confirm</CardTitle>
            <CardDescription>Confirm booking. Generating your token…</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4 space-y-1">
              <div className="font-semibold text-slate-900">{selectedDoctor?.name}</div>
              <div className="text-sm text-slate-600">{selectedDept?.name} • {date} • {selectedTime}</div>
              <div className="text-sm text-slate-600">Fee: {selectedDoctor ? formatCurrency(selectedDoctor.consultationFee) : "-"}</div>
            </div>

            <Button
              className="w-full bg-sky-600 hover:bg-sky-700"
              disabled={confirming}
              onClick={detailsForm.handleSubmit(confirmBooking)}
            >
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={confirming ? "ml-2" : ""}>{confirming ? "Generating your token..." : "Confirm Booking"}</span>
            </Button>

            <div className="flex justify-between">
              <Button variant="outline" onClick={back} disabled={confirming}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Booking Confirmed
            </CardTitle>
            <CardDescription>Your token is generated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-white p-6 text-center">
              <div className="text-sm text-slate-600">TOKEN</div>
              <div className="text-3xl font-bold tracking-wider text-slate-900">{confirmation?.tokenCode ?? "-"}</div>
              <div className="text-sm text-slate-600 mt-2">
                Position: #{confirmation?.queue?.position ?? "-"} • Est. wait: {confirmation?.queue?.estimatedWaitMinutes ?? 0} min
              </div>
            </div>

            <div className="rounded-lg border bg-slate-50 p-4 space-y-1">
              <div className="font-semibold text-slate-900">{confirmation?.appointment?.doctor?.name ?? selectedDoctor?.name}</div>
              <div className="text-sm text-slate-600">
                {confirmation?.appointment?.department?.name ?? selectedDept?.name} • {date} • {selectedTime}
              </div>
              <div className="text-sm text-slate-600">
                Fee: {confirmation?.appointment?.consultationFee ? formatCurrency(confirmation.appointment.consultationFee) : "-"}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {confirmation?.appointment?.id ? (
                <LocalizedLink
                  href={`/queue/${confirmation.appointment.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                >
                  View live queue status →
                </LocalizedLink>
              ) : (
                <Button className="bg-sky-600 hover:bg-sky-700" disabled>
                  View live queue status →
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Download Token (simple)
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/payments/${confirmation?.appointment?.id ?? ""}`)}
              >
                Pay Now
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const text = `My appointment token: ${confirmation?.tokenCode ?? ""}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
                }}
              >
                Share via WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-slate-600 flex items-center gap-2">
          Loading booking…
        </div>
      }
    >
      <BookPageInner />
    </Suspense>
  )
}
