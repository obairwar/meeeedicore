"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import QRCode from "qrcode"
import { ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { SafeImage } from "@/components/shared/SafeImage"
import { toastError, toastLoading, toastDismiss, toastSuccess } from "@/lib/toast-api"

type Prescription = {
  id: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instructions: string | null
}

type LabOrder = { id: string; testName: string; status: string; resultUrl: string | null }

type RecordRow = {
  id: string
  createdAt: string
  summary: string
  diagnosis: string | null
  notes: string | null
  followUpAt: string | null
  doctorName: string
  departmentName: string
  familyMemberName: string | null
  medicinesCount: number
  labTestsCount: number
  prescriptions: Prescription[]
  labOrders: LabOrder[]
  prescriptionQrData: string | null
}

function MedicalRecordsPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const familyFilter = searchParams.get("familyMemberId") ?? ""
  const [records, setRecords] = useState<RecordRow[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])
  const [year, setYear] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (year) q.set("year", year)
    if (departmentId) q.set("departmentId", departmentId)
    if (doctorId) q.set("doctorId", doctorId)
    if (familyFilter) q.set("familyMemberId", familyFilter)
    const res = await fetch(`/api/medical-records?${q.toString()}`, { cache: "no-store" })
    if (!res.ok) {
      toastError("Could not load records")
      setLoading(false)
      return
    }
    const j = await res.json()
    const payload = j.success && j.data ? j.data : j
    setRecords(payload.records ?? [])
    setDepartments((payload.filterOptions?.departments as { id: string; name: string }[]) ?? [])
    setDoctors((payload.filterOptions?.doctors as { id: string; name: string }[]) ?? [])
    setLoading(false)
  }, [year, departmentId, doctorId, familyFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = expanded
    if (!id) return
    const r = records.find((x) => x.id === id)
    if (!r || qrMap[id]) return
    const payload = r.prescriptionQrData ?? `MR:${r.id}`
    void QRCode.toDataURL(payload, { width: 160, margin: 1 }).then((url) => {
      setQrMap((m) => ({ ...m, [id]: url }))
    })
  }, [expanded, records, qrMap])

  async function downloadHistory() {
    const uid = session?.user?.id
    if (!uid) return
    setExporting(true)
    const tid = toastLoading("Generating PDF…")
    try {
      const res = await fetch(`/api/export/patient/${uid}`, { method: "POST" })
      if (!res.ok) {
        toastDismiss(tid)
        toastError("Could not generate PDF")
        return
      }
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = "medical-history.pdf"
      a.click()
      URL.revokeObjectURL(a.href)
      toastDismiss(tid)
      toastSuccess("PDF download started")
    } catch {
      toastDismiss(tid)
      toastError("PDF export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Medical history</h1>
          <p className="text-sm text-slate-600">Timeline of visits, prescriptions, and lab tests.</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={exporting || !session?.user}
          onClick={() => void downloadHistory()}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download full history
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end rounded-lg border bg-white p-4">
        <div className="space-y-1">
          <Label>Year</Label>
          <select
            className="h-9 rounded-md border bg-white px-2 text-sm min-w-[120px]"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">All years</option>
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Department</Label>
          <select
            className="h-9 rounded-md border bg-white px-2 text-sm min-w-[160px]"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Doctor</Label>
          <select
            className="h-9 rounded-md border bg-white px-2 text-sm min-w-[160px]"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="">All</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
          Apply
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading records…
        </div>
      ) : records.length === 0 ? (
        <p className="text-slate-600 text-sm">No medical records yet.</p>
      ) : (
        <div className="relative pl-6 border-l-2 border-sky-200 space-y-6">
          {records.map((r) => {
            const open = expanded === r.id
            return (
              <div key={r.id} className="relative">
                <div className="absolute -left-[29px] top-3 h-3 w-3 rounded-full bg-sky-600 ring-4 ring-white" />
                <div className="rounded-lg border bg-white shadow-sm">
                  <button
                    type="button"
                    className="w-full text-left p-4 flex justify-between gap-3"
                    onClick={() => setExpanded(open ? null : r.id)}
                  >
                    <div>
                      <div className="text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                      <div className="font-semibold text-slate-900">{r.doctorName}</div>
                      <div className="text-sm text-slate-600">{r.departmentName}</div>
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">{r.summary}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{r.medicinesCount} medicines</Badge>
                        <Badge variant="outline">{r.labTestsCount} lab tests</Badge>
                        {r.familyMemberName ? <Badge className="bg-violet-100 text-violet-900">{r.familyMemberName}</Badge> : null}
                      </div>
                    </div>
                    {open ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
                  </button>
                  {open ? (
                    <div className="border-t px-4 pb-4 pt-2 space-y-4 text-sm">
                      {r.diagnosis ? (
                        <div>
                          <div className="font-medium text-slate-900">Diagnosis</div>
                          <p className="text-slate-700">{r.diagnosis}</p>
                        </div>
                      ) : null}
                      {r.notes ? (
                        <div>
                          <div className="font-medium text-slate-900">Notes</div>
                          <p className="text-slate-700 whitespace-pre-wrap">{r.notes}</p>
                        </div>
                      ) : null}
                      {r.followUpAt ? (
                        <div className="text-slate-700">
                          <span className="font-medium">Follow-up: </span>
                          {new Date(r.followUpAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </div>
                      ) : null}

                      <div>
                        <div className="font-medium text-slate-900 mb-2">Prescriptions</div>
                        {r.prescriptions.length === 0 ? (
                          <p className="text-slate-500">None</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="p-2 text-left">Medicine</th>
                                  <th className="p-2 text-left">Dosage</th>
                                  <th className="p-2 text-left">Frequency</th>
                                  <th className="p-2 text-left">Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.prescriptions.map((p) => (
                                  <tr key={p.id} className="border-t">
                                    <td className="p-2">{p.medicineName}</td>
                                    <td className="p-2">{p.dosage}</td>
                                    <td className="p-2">{p.frequency}</td>
                                    <td className="p-2">{p.duration}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {qrMap[r.id] ? (
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <SafeImage
                              src={qrMap[r.id]}
                              alt="Prescription verification QR"
                              width={96}
                              height={96}
                              className="h-24 w-24 border rounded"
                            />
                            <span className="text-xs text-slate-500">Show at pharmacy for verification</span>
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div className="font-medium text-slate-900 mb-2">Lab results</div>
                        {r.labOrders.length === 0 ? (
                          <p className="text-slate-500">None</p>
                        ) : (
                          <ul className="space-y-2">
                            {r.labOrders.map((l) => (
                              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md px-3 py-2">
                                <span>{l.testName}</span>
                                <Badge variant="outline">{l.status}</Badge>
                                {l.resultUrl ? (
                                  <a
                                    href={l.resultUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={buttonVariants({ size: "sm", variant: "outline" })}
                                  >
                                    View result
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-500">Pending</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MedicalRecordsPageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      }
    >
      <MedicalRecordsPage />
    </Suspense>
  )
}
