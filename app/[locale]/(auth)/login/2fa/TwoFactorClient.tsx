"use client"

import { useRouter } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TwoFactorClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") ?? "/dashboard", [searchParams])

  const [otp, setOtp] = useState("")
  const [backupCode, setBackupCode] = useState("")
  const [useBackup, setUseBackup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem("hospital.2fa.tempToken")) {
      router.replace("/login")
    }
  }, [router])

  async function submit(code?: string) {
    if (submitting) return
    const tempToken = sessionStorage.getItem("hospital.2fa.tempToken")
    if (!tempToken) {
      router.replace("/login")
      return
    }

    setSubmitting(true)
    setError(null)

    const body = useBackup
      ? { tempToken, backupCode: (code ?? backupCode).trim() }
      : { tempToken, otp: (code ?? otp).trim() }

    const res = await fetch("/api/auth/2fa/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })

    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      lockedUntil?: number
    }

    if (!res.ok) {
      setError(data.error ?? "Verification failed.")
      if (typeof data.lockedUntil === "number") setLockedUntil(data.lockedUntil)
      setSubmitting(false)
      return
    }

    sessionStorage.removeItem("hospital.2fa.tempToken")
    router.replace(callbackUrl)
    router.refresh()
    setSubmitting(false)
  }

  return (
    <Card className="w-full max-w-md border-sky-100 shadow-sm">
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lockedUntil && lockedUntil > Date.now() ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            Too many attempts. Try again after{" "}
            {new Date(lockedUntil).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
        ) : null}

        {!useBackup ? (
          <div className="space-y-2">
            <Label htmlFor="otp">Authenticator code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={otp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6)
                setOtp(v)
                if (v.length === 6 && !useBackup) void submit(v)
              }}
              placeholder="000000"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="backup">Backup code</Label>
            <Input
              id="backup"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="XXXX-XXXX"
            />
          </div>
        )}

        <button
          type="button"
          className="text-sm text-sky-700 hover:underline"
          onClick={() => {
            setUseBackup((v) => !v)
            setError(null)
            setOtp("")
            setBackupCode("")
          }}
        >
          {useBackup ? "Use authenticator code" : "Use backup code"}
        </button>

        {useBackup ? (
          <Button
            type="button"
            className="w-full bg-sky-600 hover:bg-sky-700"
            disabled={submitting || backupCode.length < 4}
            onClick={() => void submit()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
