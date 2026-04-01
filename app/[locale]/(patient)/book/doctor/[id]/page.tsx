"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, Star } from "lucide-react"
import { AvatarImage } from "@/components/shared/AvatarImage"
import { buttonVariants } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

type DoctorProfile = {
  id: string
  name: string
  specialization: string
  experienceYears: number
  rating: number
  ratingCount: number
  consultationFee: number
  bio: string | null
  photoUrl: string | null
  department: { name: string; code: string }
  reviews: { id: string; rating: number; comment: string | null; createdAt: string; patientName: string }[]
}

export default function DoctorProfilePage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<DoctorProfile | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/doctors/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then(setData)
      .catch(() => setErr("Could not load doctor"))
  }, [params.id])

  if (err) {
    return (
      <div className="space-y-2">
        <p className="text-red-600">{err}</p>
        <Link href="/book" className={buttonVariants({ variant: "outline" })}>
          Back to booking
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {data.photoUrl ? (
            <AvatarImage src={data.photoUrl} alt={`Photo of ${data.name}`} size={80} />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-500 text-xl font-semibold">
              {data.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
          <p className="text-slate-600">{data.specialization}</p>
          <p className="text-sm text-slate-500">
            {data.department.name} · {data.experienceYears} yrs exp · {formatCurrency(data.consultationFee)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-amber-600">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-medium">{data.rating.toFixed(1)}</span>
            <span className="text-slate-500 text-sm">({data.ratingCount} ratings)</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-2">About</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.bio ?? "No bio."}</p>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-slate-900">Recent reviews</h2>
        {data.reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No public reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.reviews.map((r) => (
              <li key={r.id} className="border-t pt-3 first:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{r.patientName}</span>
                  <span className="text-amber-600 text-sm">{"★".repeat(r.rating)}</span>
                </div>
                {r.comment ? <p className="text-sm text-slate-600 mt-1">{r.comment}</p> : null}
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/book" className={buttonVariants({ variant: "outline" })}>
        Back to booking
      </Link>
    </div>
  )
}
