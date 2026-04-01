import { Skeleton } from "@/components/ui/skeleton"

export default function PatientPortalLoading() {
  return (
    <div className="flex min-h-[50vh] w-full min-w-0 max-w-full gap-4" aria-busy="true" aria-label="Loading patient portal">
      <aside className="hidden md:block w-52 shrink-0 space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </aside>
      <div className="flex-1 min-w-0 space-y-4">
        <Skeleton className="h-9 w-48 max-w-full" />
        <Skeleton className="h-36 w-full rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
