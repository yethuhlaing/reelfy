'use client'

interface Props {
  index: number
}

export function SkeletonSceneCard({ index }: Props) {
  return (
    <div className="relative pointer-events-none overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.25)]" aria-busy="true">
      <div className="absolute left-3 top-3 z-[1] rounded bg-[var(--bg)] px-2 py-1 text-[0.7rem] text-[var(--muted)]">Scene {index + 1}</div>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-[var(--surface2)] ring-1 ring-inset ring-[var(--border)]">
        <div className="absolute inset-0 animate-pulse bg-[var(--surface2)]" />
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <div className="h-2.5 w-[90%] animate-pulse rounded bg-[var(--surface2)]" />
        <div className="h-2.5 w-[60%] animate-pulse rounded bg-[var(--surface2)]" />
      </div>
    </div>
  )
}
