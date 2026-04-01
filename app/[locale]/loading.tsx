import { Skeleton } from "@/components/ui/skeleton"

export default function LocaleLoading() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}
