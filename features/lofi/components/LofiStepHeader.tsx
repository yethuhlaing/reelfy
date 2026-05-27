'use client'

import { ChevronLeft } from 'lucide-react'
import { LofiStepper } from './LofiStepper'
import type { LofiStep } from '@/features/lofi/lib/constants'

const STEP_HEADINGS: Record<LofiStep, { title: string; subtitle: string }> = {
  setup: {
    title: 'Set your vibe',
    subtitle: 'Describe the mood, pick duration and models.',
  },
  prompts: {
    title: 'Edit prompts',
    subtitle: 'Fine-tune the generated music and visual prompts.',
  },
  review: {
    title: 'Review & generate',
    subtitle: 'Confirm cost and kick off the render.',
  },
}

export function LofiStepHeader({
  step,
  onBack,
  showBack,
}: {
  step: LofiStep
  onBack?: () => void
  showBack: boolean
}) {
  const heading = STEP_HEADINGS[step]

  return (
    <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6">
      <LofiStepper step={step} />
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
