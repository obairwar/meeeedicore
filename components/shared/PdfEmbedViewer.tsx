"use client"

/**
 * Inline PDF preview (client-only). Parent should load this via next/dynamic with ssr: false.
 */
export function PdfEmbedViewer({ src, title = "Document preview" }: { src: string; title?: string }) {
  if (!src) return null
  return (
    <div className="w-full max-w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <iframe
        title={title}
        src={src}
        className="h-[min(70vh,480px)] w-full min-w-0"
      />
    </div>
  )
}
