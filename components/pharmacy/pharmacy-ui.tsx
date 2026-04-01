"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { toastError } from "@/lib/toast-api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export type PrescriptionGroup = {
  medicalRecordId: string
  createdAt: string
  tokenCode: string | null
  diagnosis: string | null
  qrData: string | null
  patient: { id: string; name: string }
  doctor: { id: string; name: string } | null
  items: Array<{
    id: string
    medicineName: string
    dosage: string
    frequency: string
    duration: string
    instructions: string | null
    dispensedAt: string | null
  }>
  medicinesCount: number
  pendingCount: number
  status: "PENDING" | "DISPENSED"
}

export type InventoryItem = {
  id: string
  name: string
  category: string | null
  quantity: number
  unit: string
  minThreshold: number
  expiry: string | null
  supplier: string | null
  createdAt: string
  updatedAt: string
}

export function PharmacistStats({
  groups,
  inventory,
}: {
  groups: PrescriptionGroup[]
  inventory: InventoryItem[]
}) {
  const pending = groups.filter((g) => g.pendingCount > 0).length
  const dispensedToday = groups.filter((g) => {
    const anyToday = g.items.some((it) => {
      if (!it.dispensedAt) return false
      const d = new Date(it.dispensedAt)
      return d.toDateString() === new Date().toDateString()
    })
    return anyToday
  }).length
  const lowStock = inventory.filter((i) => i.quantity <= i.minThreshold).length

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Pending prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{pending}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Dispensed today</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{dispensedToday}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Low stock alerts</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{lowStock}</CardContent>
      </Card>
    </div>
  )
}

export function usePrescriptionGroups(q: string) {
  const [loading, setLoading] = React.useState(true)
  const [groups, setGroups] = React.useState<PrescriptionGroup[]>([])

  const load = React.useCallback(async () => {
    setLoading(true)
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
    const res = await fetch(`/api/pharmacy/prescriptions${qs}`, { cache: "no-store" })
    if (!res.ok) {
      toastError("Could not load prescriptions")
      setLoading(false)
      return
    }
    const json = (await res.json()) as PrescriptionGroup[]
    setGroups(json)
    setLoading(false)
  }, [q])

  React.useEffect(() => {
    void load()
  }, [load])

  return { loading, groups, reload: load }
}

export function useInventory() {
  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<InventoryItem[]>([])

  const load = React.useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/inventory`, { cache: "no-store" })
    if (!res.ok) {
      toastError("Could not load inventory")
      setLoading(false)
      return
    }
    const json = (await res.json()) as InventoryItem[]
    setItems(json)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  return { loading, items, reload: load }
}

export async function dispenseItems(medicalRecordId: string, prescriptionIds: string[]) {
  const res = await fetch(`/api/pharmacy/prescriptions/${medicalRecordId}/dispense`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prescriptionIds }),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(j?.error || "Dispense failed")
  }
}

export function PendingPrescriptionsList({
  groups,
  onVerify,
}: {
  groups: PrescriptionGroup[]
  onVerify: (g: PrescriptionGroup) => void
}) {
  const pending = groups
    .filter((g) => g.pendingCount > 0)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

  return (
    <div className="space-y-2">
      {pending.map((g) => (
        <div key={g.medicalRecordId} className="rounded-lg border bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{g.patient.name}</div>
              <div className="text-xs text-slate-600">
                {g.doctor?.name ?? "—"} • {new Date(g.createdAt).toLocaleString()}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {g.tokenCode ? <Badge variant="secondary">{g.tokenCode}</Badge> : null}
                <Badge variant="outline">{g.medicinesCount} meds</Badge>
                <Badge variant="outline">{g.pendingCount} pending</Badge>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onVerify(g)}>
              QR verify
            </Button>
          </div>
        </div>
      ))}
      {pending.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">No pending prescriptions.</div>
      ) : null}
    </div>
  )
}

export function PrescriptionDetail({
  group,
  inventory,
  selected,
  setSelected,
}: {
  group: PrescriptionGroup
  inventory: InventoryItem[]
  selected: Set<string>
  setSelected: (s: Set<string>) => void
}) {
  const [altOpen, setAltOpen] = React.useState(false)
  const [altFor, setAltFor] = React.useState<string | null>(null)
  const [altBusy, setAltBusy] = React.useState(false)
  const [altError, setAltError] = React.useState<string | null>(null)
  const [alternatives, setAlternatives] = React.useState<
    Array<{ id: string; name: string; category: string | null; quantity: number; unit: string }>
  >([])

  const inventoryByName = React.useMemo(() => {
    const m = new Map<string, InventoryItem>()
    for (const it of inventory) m.set(it.name.toLowerCase(), it)
    return m
  }, [inventory])

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">{group.patient.name}</div>
          <div className="text-sm text-slate-600">
            Doctor: {group.doctor?.name ?? "—"}
            {group.tokenCode ? ` • Token: ${group.tokenCode}` : ""}
          </div>
          {group.diagnosis ? <div className="mt-1 text-sm text-slate-700">Diagnosis: {group.diagnosis}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{group.medicinesCount} medicines</Badge>
          <Badge variant={group.pendingCount === 0 ? "default" : "secondary"}>
            {group.pendingCount === 0 ? "DISPENSED" : "PENDING"}
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">Dispense</th>
              <th className="px-3 py-2">Medicine</th>
              <th className="px-3 py-2">Dose</th>
              <th className="px-3 py-2">Freq</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((it) => {
              const inv = inventoryByName.get(it.medicineName.toLowerCase()) ?? null
              const out = inv ? inv.quantity <= 0 : true
              const low = inv ? inv.quantity <= inv.minThreshold : false
              const checked = selected.has(it.id)
              const disabled = Boolean(it.dispensedAt)
              return (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={disabled ? true : checked}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(it.id)
                        else next.delete(it.id)
                        setSelected(next)
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{it.medicineName}</td>
                  <td className="px-3 py-2">{it.dosage}</td>
                  <td className="px-3 py-2">{it.frequency}</td>
                  <td className="px-3 py-2">{it.duration}</td>
                  <td className="px-3 py-2">
                    {inv ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {inv.quantity} {inv.unit}
                        </span>
                        {out ? (
                          <Badge variant="destructive">Out</Badge>
                        ) : low ? (
                          <Badge variant="secondary">Low</Badge>
                        ) : (
                          <Badge variant="outline">OK</Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">Not tracked</Badge>
                    )}

                    {out ? (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            setAltOpen(true)
                            setAltFor(it.medicineName)
                            setAltBusy(true)
                            setAltError(null)
                            setAlternatives([])
                            try {
                              const res = await fetch("/api/ai/medicine-alternatives", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ medicineName: it.medicineName, limit: 5 }),
                              })
                              if (!res.ok) {
                                const j = (await res.json().catch(() => null)) as { error?: string } | null
                                throw new Error(j?.error || "Failed to fetch alternatives")
                              }
                              const j = (await res.json()) as {
                                alternatives: Array<{
                                  id: string
                                  name: string
                                  category: string | null
                                  quantity: number
                                  unit: string
                                }>
                              }
                              setAlternatives(j.alternatives ?? [])
                            } catch (e) {
                              setAltError(e instanceof Error ? e.message : "Failed to fetch alternatives")
                            } finally {
                              setAltBusy(false)
                            }
                          }}
                        >
                          Suggest Alternative
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={altOpen}
        title={altFor ? `Alternatives for ${altFor}` : "Alternatives"}
        onClose={() => {
          setAltOpen(false)
          setAltFor(null)
          setAltError(null)
          setAlternatives([])
          setAltBusy(false)
        }}
      >
        {altBusy ? <div className="text-sm text-slate-600">Loading...</div> : null}
        {altError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{altError}</div>
        ) : null}
        {!altBusy && !altError ? (
          <div className="space-y-2">
            {alternatives.map((a) => (
              <div key={a.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                    <div className="text-xs text-slate-600">{a.category ?? "—"}</div>
                  </div>
                  <Badge variant="outline">
                    {a.quantity} {a.unit}
                  </Badge>
                </div>
              </div>
            ))}
            {alternatives.length === 0 ? <div className="text-sm text-slate-600">No in-stock alternatives found.</div> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export function InventoryTable({
  items,
  onEdit,
  onAdjust,
  onDelete,
}: {
  items: InventoryItem[]
  onEdit: (it: InventoryItem) => void
  onAdjust: (it: InventoryItem) => void
  onDelete: (it: InventoryItem) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Min</th>
            <th className="px-3 py-2">Expiry</th>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const isRed = it.quantity <= it.minThreshold
            const isYellow = !isRed && it.quantity <= 2 * it.minThreshold
            const rowClass = isRed ? "bg-red-50" : isYellow ? "bg-yellow-50" : ""
            return (
              <tr key={it.id} className={`border-t ${rowClass}`}>
                <td className="px-3 py-2 font-medium text-slate-900">{it.name}</td>
                <td className="px-3 py-2">{it.category ?? "—"}</td>
                <td className="px-3 py-2">{it.quantity}</td>
                <td className="px-3 py-2">{it.unit}</td>
                <td className="px-3 py-2">{it.minThreshold}</td>
                <td className="px-3 py-2">{it.expiry ? new Date(it.expiry).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2">{it.supplier ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onAdjust(it)}>
                      Update Stock
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEdit(it)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(it)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
          {items.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-slate-500" colSpan={8}>
                No inventory items.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

export function ExportCsvButton({ items }: { items: InventoryItem[] }) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const headers = ["name", "category", "quantity", "unit", "minThreshold", "expiry", "supplier"]
        const rows = items.map((i) => [
          i.name,
          i.category ?? "",
          String(i.quantity),
          i.unit,
          String(i.minThreshold),
          i.expiry ?? "",
          i.supplier ?? "",
        ])
        const csv = [headers, ...rows]
          .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
          .join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      Export CSV
    </Button>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      {children}
    </div>
  )
}

export function SearchBar({
  value,
  setValue,
  placeholder,
}: {
  value: string
  setValue: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      {value ? (
        <Button variant="outline" onClick={() => setValue("")}>
          Clear
        </Button>
      ) : null}
    </div>
  )
}

