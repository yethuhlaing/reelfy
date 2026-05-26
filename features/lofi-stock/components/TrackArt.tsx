'use client'

import { Music } from 'lucide-react'

export function TrackArt({
  src,
  title,
  size = 'md',
}: {
  src?: string
  title: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10'
  const icon = size === 'sm' ? 14 : 16

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-md object-cover bg-[var(--surface2)]`}
      />
    )
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]`}
      aria-hidden
    >
      <Music size={icon} />
    </div>
  )
}
