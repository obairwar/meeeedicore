"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { useCallback, useEffect, useState } from "react"
import Script from "next/script"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { toastError, toastLoading, toastDismiss, toastSuccess } from "@/lib/toast-api"
import type { BillBreakdown } from "@/lib/payment-breakdown"

type PayPayload = {
  payment: {
    id: string
    amount: number
    status: string
    breakdown: BillBreakdown | null
    invoiceUrl: string | null
    razorpayOrderId: string | null
    paidAt: string | null
  }
  appointment: {
    id: string
    startsAt: string
    tokenCode: string
    doctorName: string
    departmentName: string
  }
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (ev: string, fn: () => void) => void }
  }
}

export default function PaymentDetailPage() {
  const params = useParams<{ appointmentId: string }>()
  const router = useRouter()
  const appointmentId = params.appointmentId

  const [data, setData] = useState<PayPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState<{ invoiceUrl: string | null } | null>(null)
  const [rzpReady, setRzpReady] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    const res = await fetch(`/api/patient/payments/${appointmentId}`, { cache: "no-store" })
    const j = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = j?.error ?? "Failed to load"
      setErr(msg)
      toastError(msg)
      setData(null)
    } else {
      setData(j as PayPayload)
    }
    setLoading(false)
  }, [appointmentId])

  useEffect(() => {
    void load()
  }, [load])

  async function payNow() {
    if (!data || data.payment.status === "PAID") return
    setPaying(true)
    setErr(null)
    const tid = toastLoading("Processing payment…")
    try {
      const cr = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      })
      const cj = await cr.json()
      if (!cr.ok) throw new Error(cj?.error ?? "Could not start payment")
      if (cj.alreadyPaid) {
        toastDismiss(tid)
        toastSuccess("Already paid")
        setSuccess({ invoiceUrl: cj.invoiceUrl ?? data.payment.invoiceUrl })
        await load()
        setPaying(false)
        return
      }

      const key = cj.keyId as string
      const orderId = cj.orderId as string

      if (!rzpReady || !window.Razorpay) {
        throw new Error("Payment SDK not loaded — refresh and try again")
      }

      const rzp = new window.Razorpay({
        key,
        order_id: orderId,
        name: "Hospital payment",
        description: `Appointment ${data.appointment.tokenCode}`,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const vr = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(response),
          })
          const vj = await vr.json()
          if (!vr.ok) {
            const msg = vj?.error ?? "Verification failed"
            setErr(msg)
            toastError(msg)
            setPaying(false)
            return
          }
          toastSuccess("Payment successful")
          setSuccess({ invoiceUrl: vj.invoiceUrl ?? null })
          await load()
          setPaying(false)
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      })
      rzp.on("payment.failed", () => {
        setErr("Payment failed or cancelled")
        toastError("Payment failed or cancelled")
        setPaying(false)
      })
      toastDismiss(tid)
      rzp.open()
    } catch (e: unknown) {
      toastDismiss(tid)
      const msg = e instanceof Error ? e.message : "Error"
      setErr(msg)
      toastError(msg)
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  if (err && !data) {
    return (
      <div className="space-y-2">
        <p className="text-red-600">{err}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/payments")}>
          Back to payments
        </Button>
      </div>
    )
  }

  if (!data) return null

  const b = data.payment.breakdown

  if (success || data.payment.status === "PAID") {
    const inv = success?.invoiceUrl ?? data.payment.invoiceUrl
    return (
      <div className="max-w-lg space-y-4">
        <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-6 text-center space-y-2">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
          <h1 className="text-xl font-semibold text-slate-900">Payment successful</h1>
          <p className="text-sm text-slate-600">Thank you. Your receipt has been emailed.</p>
        </div>
        {inv ? (
          <a
            href={`/api/payments/invoice/${data.payment.id}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ className: "w-full justify-center bg-sky-600 hover:bg-sky-700 text-white border-transparent" })}
          >
            Download invoice
          </a>
        ) : (
          <p className="text-sm text-slate-500 text-center">Invoice link will appear once generated.</p>
        )}
        <Link href="/dashboard/payments" className={buttonVariants({ variant: "outline", className: "w-full justify-center" })}>
          Back to payments
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRzpReady(true)} />

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pay bill</h1>
        <p className="text-sm text-slate-600">
          {data.appointment.doctorName} · {data.appointment.departmentName}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {new Date(data.appointment.startsAt).toLocaleString("en-IN")} · Token {data.appointment.tokenCode}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3 text-sm">
        <div className="font-medium text-slate-900">Itemized bill</div>
        {b ? (
          <>
            <div className="flex justify-between">
              <span>Consultation Fee</span>
              <span>{formatCurrency(b.consultationFee)}</span>
            </div>
            {b.labItems.map((l) => (
              <div key={l.name} className="flex justify-between">
                <span>Lab: {l.name}</span>
                <span>{formatCurrency(l.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-slate-600">
              <span>Tax ({b.taxRate * 100}%)</span>
              <span>{formatCurrency(b.tax)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(b.total)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(data.payment.amount)}</span>
          </div>
        )}
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <Button
        className="w-full bg-sky-600 hover:bg-sky-700"
        disabled={paying || !rzpReady}
        onClick={() => void payNow()}
      >
        {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Pay now — {formatCurrency(data.payment.amount)}
      </Button>
      {!rzpReady ? <p className="text-xs text-slate-500 text-center">Loading secure checkout…</p> : null}

      <Link href="/dashboard/payments" className={buttonVariants({ variant: "outline", className: "w-full justify-center" })}>
        Cancel
      </Link>
    </div>
  )
}
