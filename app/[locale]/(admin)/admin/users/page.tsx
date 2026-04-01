"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RoleTab = "ALL" | "PATIENT" | "DOCTOR" | "NURSE" | "RECEPTIONIST" | "PHARMACIST" | "LAB_TECHNICIAN" | "ADMIN"

type UserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  createdAt: string
}

const TABS: { id: RoleTab; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PATIENT", label: "Patients" },
  { id: "DOCTOR", label: "Doctors" },
  { id: "NURSE", label: "Nurses" },
  { id: "RECEPTIONIST", label: "Receptionists" },
  { id: "PHARMACIST", label: "Pharmacists" },
  { id: "LAB_TECHNICIAN", label: "Lab" },
  { id: "ADMIN", label: "Admins" },
]

export default function AdminUsersPage() {
  const [tab, setTab] = useState<RoleTab>("ALL")
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "NURSE" as string, password: "" })

  const load = useCallback(async () => {
    setLoading(true)
    const r = new URLSearchParams()
    if (tab !== "ALL") r.set("role", tab)
    const res = await fetch(`/api/admin/users?${r.toString()}`)
    const j = await res.json()
    setRows(j.users ?? [])
    setLoading(false)
  }, [tab])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.phone ?? "").toLowerCase().includes(s)
    )
  }, [rows, q])

  useEffect(() => {
    void load()
  }, [load])

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          password: form.password || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        alert(j.error ?? "Failed")
        return
      }
      if (j.temporaryPassword) alert(`Temporary password: ${j.temporaryPassword}`)
      setOpen(false)
      setForm({ name: "", email: "", phone: "", role: "NURSE", password: "" })
      void load()
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    const header = ["name", "email", "phone", "role", "active", "joined"]
    const lines = [header.join(",")]
    for (const u of filtered) {
      lines.push(
        [u.name, u.email, u.phone ?? "", u.role, u.isActive ? "yes" : "no", u.createdAt].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "users.csv"
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-600">Manage accounts and roles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button type="button" className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
            Create user
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              tab === t.id ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.phone ?? "—"}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
                    <Badge variant={u.isActive ? "default" : "outline"} className={u.isActive ? "bg-emerald-600" : ""}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right space-x-1">
                    <UserActions key={`${u.id}-${u.role}-${u.isActive}`} user={u} onChanged={load} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">New staff user</h2>
            <form onSubmit={createUser} className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {["NURSE", "RECEPTIONIST", "PHARMACIST", "LAB_TECHNICIAN", "DOCTOR", "ADMIN", "PATIENT"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Password (optional)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-sky-600 hover:bg-sky-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function UserActions({ user, onChanged }: { user: UserRow; onChanged: () => void }) {
  const [role, setRole] = useState(user.role)

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const j = await res.json()
    if (!res.ok) alert(j.error ?? "Failed")
    else {
      if (j.newPassword) alert(`New password: ${j.newPassword}`)
      onChanged()
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={async () => {
          const r = await fetch(`/api/admin/users/${user.id}`)
          const j = await r.json()
          window.alert(JSON.stringify(j, null, 2))
        }}
      >
        View
      </Button>
      <select
        className="h-8 rounded border text-xs px-1"
        value={role}
        onChange={(e) => {
          setRole(e.target.value)
          void patch({ role: e.target.value })
        }}
      >
        {["PATIENT", "DOCTOR", "NURSE", "RECEPTIONIST", "PHARMACIST", "LAB_TECHNICIAN", "ADMIN"].map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" type="button" onClick={() => void patch({ isActive: !user.isActive })}>
        {user.isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button size="sm" variant="outline" type="button" onClick={() => void patch({ resetPassword: true })}>
        Reset pwd
      </Button>
    </>
  )
}
