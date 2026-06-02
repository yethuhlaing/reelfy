import { Skeleton } from '@/shared/ui/skeleton'
import { StoryCardSkeleton } from '@/features/stories/components/dashboard/StoryCardSkeleton'

function DashboardHeroSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <Skeleton className="min-h-[148px] rounded-2xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[88px] flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[18px]"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-14" />
        </div>
      ))}
    </section>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-7">
      <DashboardHeroSkeleton />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <StoryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
