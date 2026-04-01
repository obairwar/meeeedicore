"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ExportCsvButton,
  InventoryTable,
  LabeledField,
  Modal,
  useInventory,
  type InventoryItem,
} from "@/components/pharmacy/pharmacy-ui"

export default function PharmacistInventoryPage() {
  const { loading, items, reload } = useInventory()
  const [q, setQ] = React.useState("")

  const [addOpen, setAddOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [adjustOpen, setAdjustOpen] = React.useState(false)

  const [active, setActive] = React.useState<InventoryItem | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const filtered = items.filter((it) => {
    const s = q.trim().toLowerCase()
    if (!s) return true
    return (
      it.name.toLowerCase().includes(s) ||
      (it.category ?? "").toLowerCase().includes(s) ||
      (it.supplier ?? "").toLowerCase().includes(s)
    )
  })

  const low = items.filter((i) => i.quantity <= i.minThreshold)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void reload()}>
            Refresh
          </Button>
          <ExportCsvButton items={filtered} />
          <Button onClick={() => setAddOpen(true)}>Add Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inventory..." />
            {q ? (
              <Button variant="outline" onClick={() => setQ("")}>
                Clear
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">Loading...</div>
          ) : (
            <InventoryTable
              items={filtered}
              onEdit={(it) => {
                setActive(it)
                setEditOpen(true)
              }}
              onAdjust={(it) => {
                setActive(it)
                setAdjustOpen(true)
              }}
              onDelete={async (it) => {
                // eslint-disable-next-line no-alert
                if (!confirm(`Delete ${it.name}?`)) return
                setBusy(true)
                setError(null)
                try {
                  const res = await fetch(`/api/inventory/${it.id}`, { method: "DELETE" })
                  if (!res.ok) throw new Error("Delete failed")
                  await reload()
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Delete failed")
                } finally {
                  setBusy(false)
                }
              }}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Low stock alerts</div>
            <div className="mt-1 text-xs text-slate-600">{low.length} items at/below minimum</div>
            <div className="mt-3 space-y-2">
              {low.slice(0, 12).map((it) => (
                <div key={it.id} className="rounded-lg border bg-red-50 p-2 text-sm">
                  <div className="font-medium text-slate-900">{it.name}</div>
                  <div className="text-xs text-slate-700">
                    {it.quantity} {it.unit} (min {it.minThreshold})
                  </div>
                </div>
              ))}
              {low.length === 0 ? <div className="text-sm text-slate-600">No low stock items.</div> : null}
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        busy={busy}
        setBusy={setBusy}
        onDone={async () => {
          setAddOpen(false)
          await reload()
        }}
      />

      <EditItemModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        item={active}
        busy={busy}
        setBusy={setBusy}
        onDone={async () => {
          setEditOpen(false)
          await reload()
        }}
      />

      <AdjustStockModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        item={active}
        busy={busy}
        setBusy={setBusy}
        onDone={async () => {
          setAdjustOpen(false)
          await reload()
        }}
      />
    </div>
  )
}

function AddItemModal({
  open,
  onClose,
  busy,
  setBusy,
  onDone,
}: {
  open: boolean
  onClose: () => void
  busy: boolean
  setBusy: (v: boolean) => void
  onDone: () => Promise<void>
}) {
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [quantity, setQuantity] = React.useState("0")
  const [unit, setUnit] = React.useState("unit")
  const [minThreshold, setMinThreshold] = React.useState("0")
  const [expiry, setExpiry] = React.useState("")
  const [supplier, setSupplier] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setName("")
    setCategory("")
    setQuantity("0")
    setUnit("unit")
    setMinThreshold("0")
    setExpiry("")
    setSupplier("")
    setError(null)
  }, [open])

  return (
    <Modal open={open} title="Add Item" onClose={onClose}>
      <div className="space-y-3">
        <LabeledField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Paracetamol 500mg" />
        </LabeledField>
        <LabeledField label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Analgesic" />
        </LabeledField>
        <div className="grid grid-cols-2 gap-3">
          <LabeledField label="Quantity">
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={0} />
          </LabeledField>
          <LabeledField label="Unit">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="tabs" />
          </LabeledField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledField label="Min threshold">
            <Input value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} type="number" min={0} />
          </LabeledField>
          <LabeledField label="Expiry (optional)">
            <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} type="date" />
          </LabeledField>
        </div>
        <LabeledField label="Supplier (optional)">
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </LabeledField>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                const res = await fetch("/api/inventory", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    category: category || null,
                    quantity: Number(quantity || 0),
                    unit,
                    minThreshold: Number(minThreshold || 0),
                    expiry: expiry ? new Date(expiry).toISOString() : null,
                    supplier: supplier || null,
                  }),
                })
                if (!res.ok) {
                  const j = (await res.json().catch(() => null)) as { error?: string } | null
                  throw new Error(j?.error || "Create failed")
                }
                await onDone()
              } catch (e) {
                setError(e instanceof Error ? e.message : "Create failed")
              } finally {
                setBusy(false)
              }
            }}
            disabled={busy || !name.trim()}
          >
            {busy ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function EditItemModal({
  open,
  onClose,
  item,
  busy,
  setBusy,
  onDone,
}: {
  open: boolean
  onClose: () => void
  item: InventoryItem | null
  busy: boolean
  setBusy: (v: boolean) => void
  onDone: () => Promise<void>
}) {
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [unit, setUnit] = React.useState("unit")
  const [minThreshold, setMinThreshold] = React.useState("0")
  const [expiry, setExpiry] = React.useState("")
  const [supplier, setSupplier] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !item) return
    setName(item.name)
    setCategory(item.category ?? "")
    setUnit(item.unit)
    setMinThreshold(String(item.minThreshold))
    setExpiry(item.expiry ? new Date(item.expiry).toISOString().slice(0, 10) : "")
    setSupplier(item.supplier ?? "")
    setError(null)
  }, [open, item?.id])

  return (
    <Modal open={open} title="Edit Item" onClose={onClose}>
      <div className="space-y-3">
        <LabeledField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </LabeledField>
        <LabeledField label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </LabeledField>
        <div className="grid grid-cols-2 gap-3">
          <LabeledField label="Unit">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </LabeledField>
          <LabeledField label="Min threshold">
            <Input value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)} type="number" min={0} />
          </LabeledField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledField label="Expiry">
            <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} type="date" />
          </LabeledField>
          <LabeledField label="Supplier">
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </LabeledField>
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!item) return
              setBusy(true)
              setError(null)
              try {
                const res = await fetch(`/api/inventory/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    category: category || null,
                    unit,
                    minThreshold: Number(minThreshold || 0),
                    expiry: expiry ? new Date(expiry).toISOString() : null,
                    supplier: supplier || null,
                  }),
                })
                if (!res.ok) throw new Error("Update failed")
                await onDone()
              } catch (e) {
                setError(e instanceof Error ? e.message : "Update failed")
              } finally {
                setBusy(false)
              }
            }}
            disabled={busy || !item || !name.trim()}
          >
            {busy ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AdjustStockModal({
  open,
  onClose,
  item,
  busy,
  setBusy,
  onDone,
}: {
  open: boolean
  onClose: () => void
  item: InventoryItem | null
  busy: boolean
  setBusy: (v: boolean) => void
  onDone: () => Promise<void>
}) {
  const [adjustBy, setAdjustBy] = React.useState("0")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !item) return
    setAdjustBy("0")
    setError(null)
  }, [open, item?.id])

  return (
    <Modal open={open} title="Update Stock" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm text-slate-700">
          {item ? (
            <>
              <span className="font-medium">{item.name}</span> • Current: {item.quantity} {item.unit}
            </>
          ) : null}
        </div>
        <LabeledField label="Adjust by (+/-)">
          <Input value={adjustBy} onChange={(e) => setAdjustBy(e.target.value)} type="number" />
        </LabeledField>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!item) return
              setBusy(true)
              setError(null)
              try {
                const res = await fetch(`/api/inventory/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ adjustBy: Number(adjustBy || 0) }),
                })
                if (!res.ok) throw new Error("Adjust failed")
                await onDone()
              } catch (e) {
                setError(e instanceof Error ? e.message : "Adjust failed")
              } finally {
                setBusy(false)
              }
            }}
            disabled={busy || !item}
          >
            {busy ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

