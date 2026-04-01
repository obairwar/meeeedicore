"use client"

import { useRef } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChartCard({
  title,
  children,
  loading,
  fileName,
}: {
  title: string
  children: React.ReactNode
  loading?: boolean
  fileName: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  async function exportPng() {
    if (!ref.current) return
    const { default: html2canvas } = await import("html2canvas")
    const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#fff" })
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = `${fileName}.png`
    a.click()
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => void exportPng()}
          aria-label="Download chart as PNG"
        >
          <Download className="h-3.5 w-3.5" aria-hidden /> PNG
        </Button>
      </div>
      <div ref={ref} className="min-h-[220px]">
        {loading ? (
          <div className="flex h-[220px] items-center justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
