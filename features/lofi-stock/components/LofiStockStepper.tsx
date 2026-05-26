'use client'

import { Check } from 'lucide-react'
import type { StockStep } from '@/features/lofi-stock/lib/constants'

const STEPS: { id: StockStep; label: string }[] = [
  { id: 'playlist', label: 'Music' },
  { id: 'setup', label: 'Video' },
  { id: 'visuals', label: 'Visuals' },
  { id: 'review', label: 'Review' },
]

export function LofiStockStepper({ step }: { step: StockStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const isComplete = i < currentIndex
          const isCurrent = s.id === step
          const isLast = i === STEPS.length - 1

          return (
            <li
              key={s.id}
              className={`flex items-center ${isLast ? 'shrink-0' : 'min-w-0 flex-1'}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.75rem] font-semibold transition ${
                    isComplete
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : isCurrent
                        ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
                  }`}
                >
                  {isComplete ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={`hidden truncate text-[0.7rem] font-medium sm:block ${
                    isCurrent ? 'text-[var(--text)]' : isComplete ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="mx-2 h-0.5 min-w-[12px] flex-1 rounded-full bg-[var(--border)]"
                  aria-hidden
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: isComplete ? '100%' : isCurrent ? '50%' : '0%' }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-center text-[0.72rem] font-medium text-[var(--text)] sm:hidden">
        {STEPS[currentIndex]?.label}
      </p>
    </nav>
  )
}
