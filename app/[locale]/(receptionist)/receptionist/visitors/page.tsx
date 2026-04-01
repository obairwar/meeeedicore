"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type Patient = { id: string; name: string; phone?: string | null }
type VisitorRow = {
  id: string
  name: string
  phone: string
  relationship: string
  patient: { id: string; name: string }
  checkedInAt: string
  checkedOutAt: string | null
}

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  relationship: z.string().min(2),
  patientId: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export default function VisitorsPage() {
  const [patientQuery, setPatientQuery] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [rows, setRows] = useState<VisitorRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", relationship: "", patientId: "" },
  })

  async function refreshToday() {
    const r = await fetch("/api/visitors?today=1", { cache: "no-store" })
    const j = await r.json()
    setRows(Array.isArray(j) ? j : [])
  }

  useEffect(() => {
    refreshToday()
  }, [])

  async function searchPatients() {
    const r = await fetch(`/api/patients/search?q=${encodeURIComponent(patientQuery)}`, { cache: "no-store" })
    const j = await r.json()
    setPatients(Array.isArray(j) ? j : [])
  }

  async function onSubmit(values: FormValues) {
    setError(null)
    const r = await fetch("/api/visitors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    const j = await r.json()
    if (!r.ok) {
      setError(j?.error ?? "Failed")
      return
    }
    form.reset({ name: "", phone: "", relationship: "", patientId: "" })
    setPatients([])
    setPatientQuery("")
    await refreshToday()
  }

  async function checkout(id: string) {
    await fetch(`/api/visitors/${id}`, { method: "PATCH" })
    await refreshToday()
  }

  const activeCount = useMemo(() => rows.filter((r) => !r.checkedOutAt).length, [rows])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Visitors</h1>
          <p className="text-slate-600">Register + check-in/out (ICU max 2 active enforced)</p>
        </div>
        <Link className="text-sm text-sky-700 hover:underline" href="/receptionist/dashboard">
          Back to dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register Visitor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <div className="rounded-md border bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
            <div className="text-sm font-medium">Find patient</div>
            <div className="flex gap-2">
              <Input value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Patient name/phone" />
              <Button variant="outline" onClick={searchPatients} disabled={patientQuery.trim().length < 2}>
                Search
              </Button>
            </div>
            {patients.length ? (
              <div className="grid gap-2">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    className="rounded-md border bg-white p-3 text-left hover:bg-slate-50 flex items-center justify-between"
                    onClick={() => form.setValue("patientId", p.id)}
                    type="button"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-600">{p.phone ?? "—"}</div>
                    </div>
                    <Badge variant="outline">Select</Badge>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1 sm:col-span-2">
              <Label>Patient ID (selected)</Label>
              <Input readOnly value={form.watch("patientId")} />
            </div>
            <div className="space-y-1">
              <Label>Visitor name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...form.register("phone")} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Relationship</Label>
              <Input {...form.register("relationship")} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button className="bg-sky-600 hover:bg-sky-700" type="submit">
                Check in
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Print visitor badge (simple)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today’s logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-slate-600">Active visitors: {activeCount}</div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr className="border-b">
                  <th className="py-2">Visitor</th>
                  <th>Phone</th>
                  <th>Patient</th>
                  <th>In</th>
                  <th>Out</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td>{r.phone}</td>
                    <td>{r.patient.name}</td>
                    <td>{new Date(r.checkedInAt).toLocaleTimeString()}</td>
                    <td>{r.checkedOutAt ? new Date(r.checkedOutAt).toLocaleTimeString() : "—"}</td>
                    <td className="text-right">
                      <Button size="sm" variant="outline" disabled={!!r.checkedOutAt} onClick={() => checkout(r.id)}>
                        Check Out
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

