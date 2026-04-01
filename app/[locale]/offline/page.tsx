"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { RefreshCw, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { readQueueSnapshot, type QueueSnapshot } from "@/lib/queue-cache"

export default function OfflinePage() {
  const t = useTranslations("offline")
  const tc = useTranslations("common")
  const [offline, setOffline] = useState(false)
  const [snap, setSnap] = useState<QueueSnapshot | null>(null)

  useEffect(() => {
    setSnap(readQueueSnapshot())
    setOffline(typeof navigator !== "undefined" ? !navigator.onLine : false)
    const onOnline = () => {
      setOffline(false)
      window.location.reload()
    }
    const onOffline = () => setOffline(true)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 max-w-lg mx-auto space-y-6">
      {offline ? (
      <div
        className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3"
        role="status"
        aria-live="polite"
      >
        <span className="flex items-center gap-2 font-medium">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          {tc("offline")}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-1" aria-hidden />
          {t("reconnect")}
        </Button>
      </div>
      ) : null}

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{offline ? t("title") : tc("online")}</h1>
        <p className="text-slate-600 text-sm">{offline ? t("body") : tc("online")}</p>
      </div>

      {snap ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">{t("cachedQueue")}</CardTitle>
            <CardDescription>
              {new Date(snap.updatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Token</span>
              <span className="font-mono font-semibold">{snap.tokenCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Position</span>
              <span>#{snap.position}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">In queue</span>
              <span>{snap.totalInQueue}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
