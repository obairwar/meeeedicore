import { Skeleton } from "@/components/ui/skeleton"

export default function PharmacistPortalLoading() {
  return (
    <div className="flex min-h-[50vh] w-full min-w-0 max-w-full gap-4" aria-busy="true" aria-label="Loading pharmacy portal">
      <aside className="hidden md:block w-52 shrink-0 space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </aside>
      <div className="flex-1 min-w-0 space-y-4">
        <Skeleton className="h-9 w-52 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-lg lg:col-span-1" />
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        </div>
      </div>
    </div>
  )
}
