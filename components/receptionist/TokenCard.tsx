"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

type TokenCardProps = {
  tokenCode: string
  patientName: string
  doctorName: string
  departmentName: string
  room: string
  dateLabel: string
  timeLabel: string
  priorityLabel: string
  estimatedWaitMinutes: number
  queuePosition: number
  appointmentId: string
  /** Base URL without trailing slash, e.g. https://example.com */
  appBaseUrl: string
}

export function TokenCard({
  tokenCode,
  patientName,
  doctorName,
  departmentName,
  room,
  dateLabel,
  timeLabel,
  priorityLabel,
  estimatedWaitMinutes,
  queuePosition,
  appointmentId,
  appBaseUrl,
}: TokenCardProps) {
  const [qr, setQr] = useState<string | null>(null)
  const queueUrl = `${appBaseUrl.replace(/\/$/, "")}/queue/${appointmentId}`

  useEffect(() => {
    QRCode.toDataURL(queueUrl, { width: 160, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null))
  }, [queueUrl])

  return (
    <div
      id="receptionist-token-print-root"
      className="token-card mx-auto w-[380px] max-w-full overflow-hidden rounded-2xl border border-[var(--mc-border)] bg-white text-[var(--mc-text)] shadow-xl print:max-w-none print:border-black print:shadow-none"
    >
      <div
        className="px-5 py-4 text-center text-white"
        style={{ background: "var(--grad-blue)" }}
      >
        <div className="text-2xl" aria-hidden>
          🏥
        </div>
        <div className="mc-display text-lg font-bold tracking-tight">MediCore HMS</div>
        <p className="text-xs font-medium text-white/85">Intelligent Healthcare, Seamlessly Delivered</p>
      </div>
      <div className="border-b border-[var(--mc-border)] bg-white px-5 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--mc-muted)]">Token number</p>
        <p className="mc-token text-3xl font-black text-[var(--navy)]">{tokenCode}</p>
      </div>
      <div className="space-y-2 px-5 py-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Patient</span>
          <span className="font-semibold">{patientName}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Doctor</span>
          <span>{doctorName}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Dept</span>
          <span>{departmentName}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Room</span>
          <span className="mc-token font-semibold">{room}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-[var(--mc-border)] pt-2">
          <span className="text-[var(--mc-muted)]">Date</span>
          <span>{dateLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Time</span>
          <span>{timeLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Position</span>
          <span className="mc-token font-bold">#{queuePosition} in queue</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Est. wait</span>
          <span className="font-semibold">~{estimatedWaitMinutes} minutes</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mc-muted)]">Priority</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{priorityLabel}</span>
        </div>
      </div>
      <div className="border-t border-[var(--mc-border)] px-5 py-4 text-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Queue QR" className="mx-auto h-[120px] w-[120px]" />
        ) : (
          <div className="mx-auto h-[120px] w-[120px] animate-pulse rounded bg-slate-100" />
        )}
        <p className="mt-2 text-xs text-[var(--mc-muted)]">Scan to track your queue live</p>
      </div>
      <div className="px-4 py-3 text-center text-xs text-white" style={{ background: "var(--navy)" }}>
        Thank you for choosing MediCore HMS
      </div>
    </div>
  )
}

export function printTokenCard() {
  window.print()
}
