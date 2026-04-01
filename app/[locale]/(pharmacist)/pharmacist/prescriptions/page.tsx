"use client"

import React from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  SearchBar,
  PrescriptionDetail,
  dispenseItems,
  useInventory,
  usePrescriptionGroups,
  type PrescriptionGroup,
} from "@/components/pharmacy/pharmacy-ui"
import { toastError, toastSuccess } from "@/lib/toast-api"

const PrescriptionQrScanner = dynamic(
  () => import("@/components/pharmacy/PrescriptionQrScanner").then((m) => m.PrescriptionQrScanner),
  { ssr: false }
)

export default function PharmacistPrescriptionsPage() {
  const [q, setQ] = React.useState("")
  const { loading, groups, reload } = usePrescriptionGroups(q)
  const { items: inventory, reload: reloadInventory } = useInventory()
  const [active, setActive] = React.useState<PrescriptionGroup | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!active) return
    setSelected(new Set())
    setError(null)
  }, [active?.medicalRecordId])

  const pendingFirst = [...groups].sort((a, b) => {
    const ap = a.pendingCount > 0 ? 0 : 1
    const bp = b.pendingCount > 0 ? 0 : 1
    if (ap !== bp) return ap - bp
    return +new Date(b.createdAt) - +new Date(a.createdAt)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Prescriptions</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void reload()}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => void reloadInventory()}>
            Refresh Inventory
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-slate-700">
          Search by <span className="font-medium">patient name</span>, <span className="font-medium">token code</span>, paste{" "}
          <span className="font-medium">QR text</span>, or use <span className="font-medium">Scan QR</span> below to fill the field automatically.
        </div>
        <SearchBar value={q} setValue={setQ} placeholder="Search patient / token / QR..." />
        <PrescriptionQrScanner
          onScan={(text) => {
            setQ(text)
            setActive(null)
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Results</div>
            <Badge variant="secondary">{groups.length}</Badge>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">Loading...</div>
            ) : (
              pendingFirst.map((g) => (
                <button
                  key={g.medicalRecordId}
                  className={`w-full rounded-lg border bg-white p-3 text-left hover:bg-slate-50 ${
                    active?.medicalRecordId === g.medicalRecordId ? "ring-2 ring-slate-300" : ""
                  }`}
                  onClick={() => setActive(g)}
                >
                  <div className="text-sm font-semibold text-slate-900">{g.patient.name}</div>
                  <div className="text-xs text-slate-600">{g.doctor?.name ?? "—"}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {g.tokenCode ? <Badge variant="outline">{g.tokenCode}</Badge> : null}
                    <Badge variant="secondary">{g.pendingCount} pending</Badge>
                    <Badge variant="outline">{g.medicinesCount} meds</Badge>
                  </div>
                </button>
              ))
            )}
            {!loading && groups.length === 0 ? (
              <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">No prescriptions found.</div>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2">
          {active ? (
            <div className="space-y-3">
              <PrescriptionDetail group={active} inventory={inventory} selected={selected} setSelected={setSelected} />

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const pendingIds = active.items.filter((i) => !i.dispensedAt).map((i) => i.id)
                    setSelected(new Set(pendingIds))
                  }}
                  disabled={busy}
                >
                  Select all pending
                </Button>
                <Button
                  onClick={async () => {
                    setBusy(true)
                    setError(null)
                    try {
                      const ids = [...selected]
                      if (ids.length === 0) throw new Error("Select at least one medicine to dispense.")
                      await dispenseItems(active.medicalRecordId, ids)
                      toastSuccess("Medicines dispensed")
                      await Promise.all([reload(), reloadInventory()])
                      const fresh = await fetch(
                        `/api/pharmacy/prescriptions?q=${encodeURIComponent(active.tokenCode ?? active.patient.name)}`,
                        { cache: "no-store" }
                      ).then((r) => r.json() as Promise<PrescriptionGroup[]>)
                      const updated = fresh.find((x) => x.medicalRecordId === active.medicalRecordId) ?? null
                      setActive(updated)
                      setSelected(new Set())
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : "Dispense failed"
                      setError(msg)
                      toastError(msg)
                    } finally {
                      setBusy(false)
                    }
                  }}
                  disabled={busy}
                >
                  {busy ? "Dispensing..." : "Complete Dispensing"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">Select a prescription to view details.</div>
          )}
        </div>
      </div>
    </div>
  )
}

