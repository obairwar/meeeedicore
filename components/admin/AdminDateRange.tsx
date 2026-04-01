"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type Preset = "7" | "30" | "90" | "custom"

export function AdminDateRange({
  preset,
  onPreset,
  from,
  to,
  onFrom,
  onTo,
}: {
  preset: Preset
  onPreset: (p: Preset) => void
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
      <div className="flex gap-1">
        {(
          [
            ["7", "7d"],
            ["30", "30d"],
            ["90", "90d"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              preset === k ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
            onClick={() => onPreset(k)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            preset === "custom" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          )}
          onClick={() => onPreset("custom")}
        >
          Custom
        </button>
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function buildRangeQuery(preset: Preset, from: string, to: string) {
  if (preset === "custom" && from && to) {
    return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  }
  return `preset=${preset}`
}
