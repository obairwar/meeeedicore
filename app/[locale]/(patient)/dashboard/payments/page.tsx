"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

type Row = {
  paymentId: string
  appointmentId: string
  startsAt: string
  doctorName: string
  departmentName: string
  amount: number
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  tokenCode: string
}

function statusBadge(s: Row["status"]) {
  switch (s) {
    case "PAID":
      return <Badge className="bg-emerald-600">Paid</Badge>
    case "PENDING":
      return <Badge className="bg-amber-500 text-black">Pending</Badge>
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">{s}</Badge>
  }
}

export default function PatientPaymentsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/patient/payments", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading payments…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
        <p className="text-slate-600 text-sm">All appointment bills and payment status.</p>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3 font-medium">Appointment</th>
              <th className="p-3 font-medium">Doctor</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No payments yet. Book an appointment to generate a bill.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.paymentId} className="border-t">
                  <td className="p-3">
                    <div className="font-medium text-slate-900">
                      {new Date(r.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                    <div className="text-xs text-slate-500">{r.tokenCode}</div>
                  </td>
                  <td className="p-3">
                    <div>{r.doctorName}</div>
                    <div className="text-xs text-slate-500">{r.departmentName}</div>
                  </td>
                  <td className="p-3 font-medium">{formatCurrency(r.amount)}</td>
                  <td className="p-3">{statusBadge(r.status)}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/dashboard/payments/${r.appointmentId}`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: r.status === "PENDING" ? "default" : "outline" }),
                        r.status === "PENDING" && "bg-sky-600 hover:bg-sky-700 text-white border-transparent"
                      )}
                    >
                      {r.status === "PENDING" ? "Pay" : "View"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
