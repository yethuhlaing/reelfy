'use client'

import { Skeleton } from '@/shared/ui/skeleton'

export function StockTrackCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-[var(--surface2)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-[55%] rounded" />
        <Skeleton className="h-2.5 w-[35%] rounded" />
        <Skeleton className="h-4 w-full rounded" />
      </div>
      <div className="flex shrink-0 gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  )
}

export function StockTrackListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading tracks">
      {Array.from({ length: count }, (_, i) => (
        <StockTrackCardSkeleton key={i} />
      ))}
    </div>
  )
}
