"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Dept = {
  id: string
  code: string
  name: string
  floor: string
  rooms: number
  doctorCount: number
  todayAppointments: number
  doctors: { id: string; name: string; specialization: string }[]
}

export default function AdminDepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [edit, setEdit] = useState<Dept | null>(null)
  const [form, setForm] = useState({ code: "", name: "", floor: "", rooms: "0" })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/departments")
    const j = await res.json()
    setDepts(j.departments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addDept(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        name: form.name,
        floor: form.floor,
        rooms: Number(form.rooms) || 0,
      }),
    })
    if (!res.ok) {
      const j = await res.json()
      alert(j.error ?? "Failed")
      return
    }
    setAddOpen(false)
    setForm({ code: "", name: "", floor: "", rooms: "0" })
    void load()
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!edit) return
    const res = await fetch(`/api/admin/departments/${edit.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        code: form.code,
        floor: form.floor,
        rooms: Number(form.rooms) || 0,
      }),
    })
    if (!res.ok) {
      alert("Failed")
      return
    }
    setEdit(null)
    void load()
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-600">Rooms, floors, and doctor assignments.</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700" type="button" onClick={() => setAddOpen(true)}>
          Add department
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {depts.map((d) => (
          <div key={d.id} className="rounded-lg border bg-white p-4 space-y-2 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg text-slate-900">{d.name}</div>
                <div className="text-sm text-slate-500">
                  {d.code} · Floor {d.floor}
                </div>
              </div>
              <Button size="sm" variant="outline" type="button" onClick={() => {
                setEdit(d)
                setForm({ code: d.code, name: d.name, floor: d.floor, rooms: String(d.rooms) })
              }}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-slate-600">
              Rooms: {d.rooms} · Doctors: {d.doctorCount} · Today: {d.todayAppointments} appts
            </div>
            <div className="border-t pt-2">
              <div className="text-xs font-medium text-slate-500 mb-1">Doctors</div>
              <ul className="text-sm space-y-1">
                {d.doctors.map((doc) => (
                  <li key={doc.id} className="flex justify-between gap-2">
                    <span>{doc.name}</span>
                    <AssignDoctor doctorId={doc.id} departments={depts} onDone={load} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {addOpen ? (
        <Modal title="Add department" onClose={() => setAddOpen(false)}>
          <form onSubmit={addDept} className="space-y-3">
            <Field label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} required />
            <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Field label="Floor" value={form.floor} onChange={(v) => setForm((f) => ({ ...f, floor: v }))} required />
            <div className="space-y-1">
              <Label>Rooms</Label>
              <Input type="number" value={form.rooms} onChange={(e) => setForm((f) => ({ ...f, rooms: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700">
              Save
            </Button>
          </form>
        </Modal>
      ) : null}

      {edit ? (
        <Modal title="Edit department" onClose={() => setEdit(null)}>
          <form onSubmit={saveEdit} className="space-y-3">
            <Field label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} required />
            <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Field label="Floor" value={form.floor} onChange={(v) => setForm((f) => ({ ...f, floor: v }))} required />
            <div className="space-y-1">
              <Label>Rooms</Label>
              <Input type="number" value={form.rooms} onChange={(e) => setForm((f) => ({ ...f, rooms: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700">
              Save
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input required={required} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

function AssignDoctor({
  doctorId,
  departments,
  onDone,
}: {
  doctorId: string
  departments: Dept[]
  onDone: () => void
}) {
  return (
    <select
      className="text-xs border rounded px-1 max-w-[140px]"
      defaultValue=""
      onChange={async (e) => {
        const departmentId = e.target.value
        if (!departmentId) return
        const res = await fetch(`/api/admin/doctors/${doctorId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ departmentId }),
        })
        if (!res.ok) alert("Failed")
        else onDone()
      }}
    >
      <option value="">Move to…</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  )
}
