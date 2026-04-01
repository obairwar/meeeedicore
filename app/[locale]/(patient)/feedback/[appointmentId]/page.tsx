"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { useEffect, useState } from "react"
import { Loader2, Star } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { AvatarImage } from "@/components/shared/AvatarImage"
import { toastError, toastSuccess } from "@/lib/toast-api"

type ApptInfo = {
  appointment: { id: string; status: string; doctor: { name: string; photoUrl: string | null } }
}

export default function FeedbackPage() {
  const params = useParams<{ appointmentId: string }>()
  const router = useRouter()
  const [info, setInfo] = useState<ApptInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/patient/appointments/${params.appointmentId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error)
        else setInfo(j)
      })
      .catch(() => setErr("Failed to load"))
      .finally(() => setLoading(false))
  }, [params.appointmentId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setErr("Select a star rating")
      return
    }
    setSubmitting(true)
    setErr(null)
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        appointmentId: params.appointmentId,
        rating,
        comment: comment.trim() || undefined,
        anonymous,
      }),
    })
    const j = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      const msg = j.error ?? "Failed"
      setErr(msg)
      toastError(msg)
      return
    }
    toastSuccess("Thank you for your feedback")
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  if (err && !info) {
    return (
      <div className="space-y-2">
        <p className="text-red-600">{err}</p>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          {info?.appointment.doctor.photoUrl ? (
            <AvatarImage
              src={info.appointment.doctor.photoUrl}
              alt={`${info.appointment.doctor.name} photo`}
              size={64}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-600 font-semibold text-xl">
              {info?.appointment.doctor.name.slice(0, 1) ?? "?"}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Rate your visit</h1>
          <p className="text-slate-600">{info?.appointment.doctor.name}</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label className="mb-2 block">Your rating</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-1 rounded-md hover:bg-slate-100"
                aria-label={`${n} stars`}
              >
                <Star
                  className={cn("h-8 w-8", n <= rating ? "text-amber-500 fill-amber-400" : "text-slate-300")}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="comment">Comment (optional)</Label>
          <textarea
            id="comment"
            className="w-full min-h-24 rounded-md border bg-white p-3 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(Boolean(v))} />
          Submit anonymously
        </label>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <Button type="submit" disabled={submitting} className="w-full bg-sky-600 hover:bg-sky-700">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit feedback"}
        </Button>
      </form>

      <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "w-full justify-center" })}>
        Cancel
      </Link>
    </div>
  )
}
