import { Skeleton } from '@/shared/ui/skeleton'

export function StoryCardSkeleton() {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-2 px-4 pb-4 pt-3.5">
        <Skeleton className="h-4 w-[72%]" />
        <Skeleton className="h-3 w-full" />
      </div>
    </article>
  )
}
