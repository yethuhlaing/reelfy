'use client'

interface Props {
  index: number
}

export function SkeletonSceneCard({ index }: Props) {
  return (
    <div className="relative pointer-events-none overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]" aria-busy="true">
      <div className="absolute left-3 top-3 z-[1] rounded bg-[var(--bg)] px-2 py-1 text-[0.7rem] text-[var(--muted)]">Scene {index + 1}</div>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-white">
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,var(--surface2)_0%,var(--surface)_50%,var(--surface2)_100%)]" />
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <div className="h-2.5 w-[90%] animate-pulse rounded bg-[linear-gradient(90deg,var(--surface2)_0%,var(--surface)_50%,var(--surface2)_100%)]" />
        <div className="h-2.5 w-[60%] animate-pulse rounded bg-[linear-gradient(90deg,var(--surface2)_0%,var(--surface)_50%,var(--surface2)_100%)]" />
      </div>
    </div>
  )
}
