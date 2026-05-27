'use client'

import { Loader2 } from 'lucide-react'
import { LofiCostPreview } from './LofiCostPreview'

interface Props {
  musicModel: string
  musicLoopCount: number
  visualModel: string
  visualAssetCount: number
  balance: number | null
  isSubmitting: boolean
  onGenerate: () => void
}

export function LofiReviewStep({
  musicModel,
  musicLoopCount,
  visualModel,
  visualAssetCount,
  balance,
  isSubmitting,
  onGenerate,
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
  )
}
