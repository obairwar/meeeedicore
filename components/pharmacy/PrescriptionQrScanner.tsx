"use client"

import dynamic from "next/dynamic"

const PrescriptionQrScannerInner = dynamic(
  () => import("./PrescriptionQrScannerInner").then((m) => m.PrescriptionQrScannerInner),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading scanner…</p> }
)

type Props = {
  onScan: (text: string) => void
}

export function PrescriptionQrScanner(props: Props) {
  return <PrescriptionQrScannerInner {...props} />
}
