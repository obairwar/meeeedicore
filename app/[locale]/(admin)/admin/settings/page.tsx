"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { SystemSettingsData } from "@/lib/system-settings-defaults"

export default function AdminSettingsPage() {
  const [s, setS] = useState<SystemSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/settings")
    const j = await res.json()
    setS(j)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!s) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      })
      if (!res.ok) alert("Failed")
      else void load()
    } finally {
      setSaving(false)
    }
  }

  if (loading || !s) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">System settings</h1>
        <p className="text-sm text-slate-600">Hospital profile, queue, and notifications.</p>
      </div>

      <form onSubmit={save} className="space-y-6 rounded-lg border bg-white p-4">
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-900">Hospital</h2>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={s.hospitalName} onChange={(e) => setS((x) => ({ ...x!, hospitalName: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Logo URL</Label>
            <Input value={s.hospitalLogoUrl} onChange={(e) => setS((x) => ({ ...x!, hospitalLogoUrl: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={s.hospitalAddress} onChange={(e) => setS((x) => ({ ...x!, hospitalAddress: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={s.hospitalPhone} onChange={(e) => setS((x) => ({ ...x!, hospitalPhone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={s.hospitalEmail} onChange={(e) => setS((x) => ({ ...x!, hospitalEmail: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h2 className="font-semibold text-slate-900">Token reset</h2>
          <p className="text-xs text-slate-500">Hour (0–23) for daily auto-reset (hook to cron separately).</p>
          <Input
            type="number"
            min={0}
            max={23}
            value={s.tokenResetHour}
            onChange={(e) => setS((x) => ({ ...x!, tokenResetHour: Number(e.target.value) }))}
          />
        </div>

        <div className="space-y-3 border-t pt-4">
          <h2 className="font-semibold text-slate-900">Notifications (global)</h2>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={s.notifyGlobalEmail} onCheckedChange={(v) => setS((x) => ({ ...x!, notifyGlobalEmail: Boolean(v) }))} />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={s.notifyGlobalSms} onCheckedChange={(v) => setS((x) => ({ ...x!, notifyGlobalSms: Boolean(v) }))} />
            SMS
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={s.notifyGlobalWhatsapp} onCheckedChange={(v) => setS((x) => ({ ...x!, notifyGlobalWhatsapp: Boolean(v) }))} />
            WhatsApp
          </label>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h2 className="font-semibold text-slate-900">Queue</h2>
          <div className="space-y-1">
            <Label>Default slot duration (minutes)</Label>
            <Input
              type="number"
              value={s.defaultSlotMinutes}
              onChange={(e) => setS((x) => ({ ...x!, defaultSlotMinutes: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Max patients per doctor (daily cap)</Label>
            <Input
              type="number"
              value={s.maxPatientsPerDoctor}
              onChange={(e) => setS((x) => ({ ...x!, maxPatientsPerDoctor: Number(e.target.value) }))}
            />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="bg-sky-600 hover:bg-sky-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
        </Button>
      </form>
    </div>
  )
}
