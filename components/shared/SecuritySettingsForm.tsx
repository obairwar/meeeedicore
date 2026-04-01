"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/shared/SafeImage"
import { toastError, toastSuccess } from "@/lib/toast-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SecuritySettingsForm() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setup, setSetup] = useState<{ qrDataUrl: string; manualKey: string; secret: string } | null>(
    null
  )
  const [otp, setOtp] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [disablePassword, setDisablePassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/auth/security")
    const j = await res.json()
    if (res.ok) setTwoFactorEnabled(Boolean(j.twoFactorEnabled))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function startSetup() {
    setBusy(true)
    setMsg(null)
    const res = await fetch("/api/auth/2fa/setup")
    const j = await res.json()
    setBusy(false)
    if (!res.ok) {
      const err = j.error ?? "Could not start setup"
      setMsg(err)
      toastError(err)
      return
    }
    setSetup({ qrDataUrl: j.qrDataUrl, manualKey: j.manualKey, secret: j.secret })
  }

  async function verifySetup() {
    if (!setup) return
    setBusy(true)
    setMsg(null)
    const res = await fetch("/api/auth/2fa/verify-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: setup.secret, otp }),
    })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) {
      const err = j.error ?? "Verification failed"
      setMsg(err)
      toastError(err)
      return
    }
    setBackupCodes(j.backupCodes as string[])
    setSetup(null)
    setOtp("")
    setTwoFactorEnabled(true)
    toastSuccess("Two-factor authentication enabled")
  }

  async function disable() {
    setBusy(true)
    setMsg(null)
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: disablePassword }),
    })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) {
      const err = j.error ?? "Could not disable"
      setMsg(err)
      toastError(err)
      return
    }
    setDisablePassword("")
    setTwoFactorEnabled(false)
    setBackupCodes(null)
    toastSuccess("Two-factor authentication disabled")
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          Add an authenticator app (Google Authenticator, Authy, etc.) for stronger account protection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

        {backupCodes ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-900">Save these backup codes once</p>
            <ul className="text-sm font-mono space-y-1">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" onClick={() => setBackupCodes(null)}>
              I have saved them
            </Button>
          </div>
        ) : null}

        {setup ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">Scan this QR code or enter the key manually.</p>
            <SafeImage
              src={setup.qrDataUrl}
              alt="Scan with authenticator app"
              width={192}
              height={192}
              className="h-48 w-48 object-contain border rounded-md bg-white"
            />
            <p className="text-xs font-mono break-all text-slate-600">{setup.manualKey}</p>
            <div className="space-y-2">
              <Label htmlFor="otp-setup">6-digit code</Label>
              <Input
                id="otp-setup"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button type="button" onClick={() => void verifySetup()} disabled={busy || otp.length !== 6}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
            </Button>
          </div>
        ) : null}

        {!setup && !backupCodes && twoFactorEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700">Two-factor authentication is enabled.</p>
            <div className="space-y-2">
              <Label htmlFor="disable-pw">Password to disable 2FA</Label>
              <Input
                id="disable-pw"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void disable()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable 2FA"}
            </Button>
          </div>
        ) : null}

        {!setup && !backupCodes && !twoFactorEnabled ? (
          <Button type="button" onClick={() => void startSetup()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable two-factor authentication"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
