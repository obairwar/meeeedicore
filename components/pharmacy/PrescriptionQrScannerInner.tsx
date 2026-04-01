"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Scanner } from "@yudiel/react-qr-scanner"

type Props = {
  onScan: (text: string) => void
}

export function PrescriptionQrScannerInner({ onScan }: Props) {
  const [open, setOpen] = React.useState(false)
  const lastRef = React.useRef<string>("")

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={() => setOpen((o) => !o)} aria-pressed={open}>
        {open ? "Stop camera" : "Scan QR"}
      </Button>
      {open ? (
        <div className="max-w-md w-full overflow-hidden rounded-lg border border-slate-200 bg-black min-h-[200px]">
          <Scanner
            paused={!open}
            scanDelay={500}
            constraints={{ facingMode: "environment" }}
            onScan={(codes) => {
              const text = codes?.[0]?.rawValue?.trim()
              if (!text) return
              if (text === lastRef.current) return
              lastRef.current = text
              onScan(text)
            }}
            onError={() => {
              // Keep UI calm: user can retry by toggling camera.
            }}
          />
        </div>
      ) : null}
      <p className="text-xs text-slate-500">
        Allow camera access. The first successful decode fills the search field; scan again if needed.
      </p>
    </div>
  )
}
