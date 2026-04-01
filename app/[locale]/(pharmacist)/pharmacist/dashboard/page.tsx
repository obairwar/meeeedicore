"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { PendingPrescriptionsList, PharmacistStats, useInventory, usePrescriptionGroups, type PrescriptionGroup } from "@/components/pharmacy/pharmacy-ui"

export default function PharmacistDashboard() {
  const { groups, loading, reload } = usePrescriptionGroups("")
  const { items: inventory, reload: reloadInventory } = useInventory()
  const [active, setActive] = React.useState<PrescriptionGroup | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Pharmacist Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void reload()}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => void reloadInventory()}>
            Refresh Inventory
          </Button>
        </div>
      </div>

      <PharmacistStats groups={groups} inventory={inventory} />

      <div className="space-y-2">
        <div className="text-lg font-semibold text-slate-900">Pending Prescriptions</div>
        {loading ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">Loading...</div>
        ) : (
          <PendingPrescriptionsList
            groups={groups}
            onVerify={(g) => {
              setActive(g)
            }}
          />
        )}
        {active ? (
          <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
            Selected: <span className="font-medium">{active.patient.name}</span>. Open{" "}
            <a className="font-medium text-blue-700 underline underline-offset-2" href="/pharmacist/prescriptions">
              Prescriptions
            </a>{" "}
            and search by token/patient to dispense.
          </div>
        ) : null}
      </div>
    </div>
  )
}

