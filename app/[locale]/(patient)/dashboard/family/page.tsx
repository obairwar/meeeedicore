"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Users, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Member = {
  id: string
  name: string
  relation: string
  age: number | null
  bloodGroup: string | null
}

type Appt = {
  id: string
  startsAt: string
  tokenCode: string
  status: string
  doctorName: string
  departmentName: string
  forPatientName: string
}

export default function FamilyPage() {
  const [tab, setTab] = useState<"family" | "upcoming">("family")
  const [members, setMembers] = useState<Member[]>([])
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", relation: "", dateOfBirth: "", bloodGroup: "" })

  const load = useCallback(async () => {
    setLoading(true)
    const [m, a] = await Promise.all([fetch("/api/family"), fetch("/api/patient/appointments")])
    const mj = await m.json()
    const aj = await a.json()
    setMembers(mj.members ?? [])
    const apptPayload = aj.success && aj.data ? aj.data : aj
    setAppts(apptPayload.appointments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch("/api/family", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          relation: form.relation,
          dateOfBirth: form.dateOfBirth || undefined,
          bloodGroup: form.bloodGroup || undefined,
        }),
      })
      if (!r.ok) return
      setForm({ name: "", relation: "", dateOfBirth: "", bloodGroup: "" })
      setOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Family</h1>
        <p className="text-sm text-slate-600">Manage dependents and shared appointments.</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            tab === "family" ? "border-sky-600 text-sky-700" : "border-transparent text-slate-600 hover:text-slate-900"
          )}
          onClick={() => setTab("family")}
        >
          My family
        </button>
        <button
          type="button"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
            tab === "upcoming" ? "border-sky-600 text-sky-700" : "border-transparent text-slate-600 hover:text-slate-900"
          )}
          onClick={() => setTab("upcoming")}
        >
          Upcoming appointments
        </button>
      </div>

      {tab === "family" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2 bg-sky-600 hover:bg-sky-700" type="button" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add family member
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-slate-600">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                No family members yet. Add someone you book for.
              </div>
            ) : (
              members.map((m) => (
                <div key={m.id} className="rounded-lg border bg-white p-4 space-y-3">
                  <div className="font-semibold text-slate-900">{m.name}</div>
                  <div className="text-sm text-slate-600">{m.relation}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {m.age !== null ? <Badge variant="outline">{m.age} yrs</Badge> : null}
                    {m.bloodGroup ? <Badge variant="outline">{m.bloodGroup}</Badge> : null}
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      href={`/dashboard/records?familyMemberId=${encodeURIComponent(m.id)}`}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      View records
                    </Link>
                    <Link
                      href={`/book?familyMemberId=${encodeURIComponent(m.id)}`}
                      className={buttonVariants({ size: "sm", className: "bg-sky-600 hover:bg-sky-700 text-white border-transparent" })}
                    >
                      Book appointment
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {appts.length === 0 ? (
            <p className="text-sm text-slate-600">No upcoming family appointments.</p>
          ) : (
            <ul className="space-y-2">
              {appts.map((a) => (
                <li key={a.id} className="rounded-lg border bg-white p-4 flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{a.forPatientName}</div>
                    <div className="text-sm text-slate-600">
                      {a.doctorName} · {a.departmentName}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(a.startsAt).toLocaleString("en-IN")} · {a.tokenCode}
                    </div>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg relative">
            <button
              type="button"
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-800"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 pr-8">Add family member</h2>
            <form onSubmit={addMember} className="space-y-3 mt-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="relation">Relationship</Label>
                <Input
                  id="relation"
                  required
                  placeholder="e.g. Child, Parent"
                  value={form.relation}
                  onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bg">Blood group</Label>
                <Input
                  id="bg"
                  placeholder="e.g. O+"
                  value={form.bloodGroup}
                  onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-sky-600 hover:bg-sky-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
