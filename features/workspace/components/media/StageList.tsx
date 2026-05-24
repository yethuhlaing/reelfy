'use client'

import type { Stage } from '@/shared/lib/types'

interface StageListProps {
  stages: Stage[]
  imageProgress?: { done: number; total: number } | null
}

const STATUS_ICON: Record<Stage['status'], string> = {
  pending: '○',
  active: '⟳',
  done: '✓',
  error: '✕',
}

export function StageList({ stages, imageProgress }: StageListProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-[var(--surface2,#f7f7f7)] p-3.5">
      {stages.map((s) => {
        const showImageBar = s.id === 'images' && s.status === 'active' && imageProgress && imageProgress.total > 0
        const pct = showImageBar
          ? Math.round((imageProgress!.done / imageProgress!.total) * 100)
          : 0
        return (
          <div
            key={s.id}
            className={`flex items-start gap-2.5 text-[0.8rem] ${
              s.status === 'pending'
                ? 'text-[var(--muted)] opacity-65'
                : s.status === 'error'
                  ? 'text-[#ef4444]'
                  : s.status === 'done'
                    ? 'text-[var(--muted)]'
                    : 'text-[var(--text)]'
            }`}
          >
            <span className={`inline-flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center font-bold ${s.status === 'active' ? 'animate-spin' : ''}`}>
              {STATUS_ICON[s.status]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[0.82rem] font-semibold">{s.label}</div>
              {s.detail && <div className="text-[0.72rem] text-[var(--muted)]">{s.detail}</div>}
              {showImageBar && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded bg-[var(--surface2,#eee)]">
                    <div className="h-full bg-[var(--accent,#f97316)] transition-[width] duration-200" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[0.7rem] tabular-nums text-[var(--muted)]">
                    {imageProgress!.done}/{imageProgress!.total}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
