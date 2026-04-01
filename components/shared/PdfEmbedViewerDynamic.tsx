"use client"

import dynamic from "next/dynamic"

export const PdfEmbedViewerDynamic = dynamic(
  () => import("@/components/shared/PdfEmbedViewer").then((m) => m.PdfEmbedViewer),
  { ssr: false, loading: () => <div className="text-sm text-slate-500 py-4">Loading preview…</div> }
)
