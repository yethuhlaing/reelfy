'use client'

import { ChevronLeft } from 'lucide-react'
import { LofiStockStepper } from './LofiStockStepper'
import type { StockStep } from '@/features/lofi-stock/lib/constants'

const STEP_HEADINGS: Record<StockStep, { title: string; subtitle: string }> = {
  playlist: {
    title: 'Choose your soundtrack',
    subtitle: 'Pick tracks from the catalog. Vibe and video length come next.',
  },
  setup: {
    title: 'Set vibe & length',
    subtitle: 'Vibe, duration, and visual settings. Music comes from your playlist in step 1.',
  },
  visuals: {
    title: 'Plan the visuals',
    subtitle: 'Edit scene prompts and pick a visual model.',
  },
  review: {
    title: 'Review & generate',
    subtitle: 'Confirm everything looks right before rendering.',
  },
}

export function LofiStockStepHeader({
  step,
  onBack,
  showBack,
}: {
  step: StockStep
  onBack?: () => void
  showBack: boolean
}) {
  const heading = STEP_HEADINGS[step]

  return (
    <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6">
      <LofiStockStepper step={step} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[1.15rem] font-semibold tracking-tight text-[var(--text)]">
            {heading.title}
          </h2>
          <p className="mt-1 max-w-xl text-[0.85rem] leading-relaxed text-[var(--muted)]">
            {heading.subtitle}
          </p>
        </div>
        {showBack && onBack && (
          <button
            type="button"
            className="inline-flex w-fit shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[0.78rem] font-medium text-[var(--text)] transition hover:bg-[var(--surface2)]"
            onClick={onBack}
          >
            <ChevronLeft size={16} />
            Back
          </button>
        )}
      </div>
    </header>
  )
}
