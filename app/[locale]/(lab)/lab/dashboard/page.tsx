"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { LabOrdersTable, LabStatsCards, UploadResultModal, useLabOrders, patchLabOrderStatus } from "@/components/lab/lab-order-ui"

export default function LabDashboard() {
  const { orders, loading, statusFilter, setStatusFilter, reload } = useLabOrders()
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [uploadOrder, setUploadOrder] = React.useState<null | (typeof orders)[number]>(null)
  const filtered = statusFilter === "ALL" ? orders : orders.filter((o) => o.status === statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Lab Technician Dashboard</h1>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border bg-white px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="ALL">All</option>
            <option value="ORDERED">Ordered</option>
            <option value="SAMPLE_COLLECTED">Sample collected</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Button variant="outline" onClick={() => void reload()}>
            Refresh
          </Button>
        </div>
      </div>

      <LabStatsCards orders={orders} />

      <div className="space-y-2">
        <div className="text-lg font-semibold text-slate-900">Pending Orders</div>
        {loading ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">Loading...</div>
        ) : (
          <LabOrdersTable
            orders={filtered.filter((o) => o.status !== "COMPLETED")}
            onChangeStatus={async (id, st) => {
              await patchLabOrderStatus(id, st)
              await reload()
            }}
            onUploadResult={(o) => {
              setUploadOrder(o)
              setUploadOpen(true)
            }}
          />
        )}
      </div>

      <UploadResultModal
        open={uploadOpen}
        setOpen={setUploadOpen}
        order={uploadOrder}
        onSubmitted={async () => {
          await reload()
        }}
      />
    </div>
  )
}

