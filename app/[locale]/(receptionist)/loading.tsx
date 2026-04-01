import { Skeleton } from "@/components/ui/skeleton"

export default function ReceptionistPortalLoading() {
  return (
    <div className="flex min-h-[50vh] w-full min-w-0 max-w-full gap-4" aria-busy="true" aria-label="Loading reception portal">
      <aside className="hidden md:block w-52 shrink-0 space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </aside>
      <div className="flex-1 min-w-0 space-y-4">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-12 w-full max-w-md rounded-md" />
        <div className="overflow-x-auto rounded-lg border">
          <Skeleton className="h-56 min-w-[600px]" />
        </div>
      </div>
    </div>
  )
}
