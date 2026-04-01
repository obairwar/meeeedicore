"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  LabOrdersKanban,
  UploadResultModal,
  patchLabOrderStatus,
  useLabOrders,
  type LabOrderListItem,
} from "@/components/lab/lab-order-ui"

export default function LabOrdersPage() {
  const { orders, loading, reload } = useLabOrders()
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [uploadOrder, setUploadOrder] = React.useState<LabOrderListItem | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Lab Orders</h1>
        <Button variant="outline" onClick={() => void reload()}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">Loading...</div>
      ) : (
        <LabOrdersKanban
          orders={orders.filter((o) => o.status !== "CANCELLED")}
          onChangeStatus={async (id, status) => {
            await patchLabOrderStatus(id, status)
            await reload()
          }}
          onUploadResult={(o) => {
            setUploadOrder(o)
            setUploadOpen(true)
          }}
        />
      )}

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

