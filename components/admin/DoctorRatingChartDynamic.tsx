"use client"

import dynamic from "next/dynamic"

export const DoctorRatingChartDynamic = dynamic(
  () => import("@/components/admin/DoctorRatingTrendChart").then((m) => m.DoctorRatingTrendChart),
  { ssr: false, loading: () => <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">Loading chart…</div> }
)
