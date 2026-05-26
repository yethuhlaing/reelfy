'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export function StockTrackPagination({
  page,
  hasMore,
  hasPrev,
  onPageChange,
  disabled,
}: {
  page: number
  hasMore: boolean
  hasPrev: boolean
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  if (!hasPrev && !hasMore) return null

  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4"
      aria-label="Track list pagination"
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.78rem] font-medium text-[var(--text)] transition hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || !hasPrev}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="text-[0.75rem] tabular-nums text-[var(--muted)]">
        Page {page}
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.78rem] font-medium text-[var(--text)] transition hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || !hasMore}
        aria-label="Next page"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
