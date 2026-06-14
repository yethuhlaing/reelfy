'use client'

import { ChevronLeft, Loader2 } from 'lucide-react'
import { LofiCostPreview } from './LofiCostPreview'

interface Props {
  musicModel: string
  musicLoopCount: number
  visualModel: string
  visualAssetCount: number
  balance: number | null
  isSubmitting: boolean
  onGenerate: () => void
  onBack?: () => void
}

export function LofiReviewStep({
  musicModel,
  musicLoopCount,
  visualModel,
  visualAssetCount,
  balance,
  isSubmitting,
  onGenerate,
  onBack,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <LofiCostPreview
        musicModel={musicModel}
        musicLoopCount={musicLoopCount}
        visualModel={visualModel}
        visualAssetCount={visualAssetCount}
        balance={balance}
      />

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            className="inline-flex h-[46px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 text-[0.85rem] font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ChevronLeft size={15} /> Back
          </button>
        ) : (
          <div />
        )}
        <button
          className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-4 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={onGenerate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating…
            </>
          ) : (
            'Generate Video'
          )}
        </button>
      </div>
    </div>
  )
}
